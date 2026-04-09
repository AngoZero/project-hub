use crate::types::{
  AppStore, ProjectGitInfo, ProjectRecord, ProjectUrl, RootChildPreview, RootChildRule, RootFolder, RootFolderPreview,
  SubProject, Workspace,
};
use crate::utils::{comparable_path, make_id, normalize_path, now_iso, sanitize_list};
use serde_json::Value;
use std::{
  collections::{HashMap, HashSet},
  fs,
  path::{Path, PathBuf},
};

const IGNORED_DIRECTORIES: &[&str] = &[
  ".git",
  "node_modules",
  "vendor",
  "target",
  "dist",
  "build",
  ".next",
  ".turbo",
  ".idea",
  ".vscode",
];

const ROOT_KIND_WORKSPACE: &str = "workspace";
const ROOT_KIND_PROJECT: &str = "project";
const ROOT_KIND_IGNORED: &str = "ignored";

pub fn scan_store(mut store: AppStore) -> AppStore {
  let existing_by_path: HashMap<String, ProjectRecord> = store
    .projects
    .iter()
    .cloned()
    .map(|project| (comparable_path(&project.path), project))
    .collect();

  let existing_workspaces: HashMap<String, Workspace> = store
    .workspaces
    .iter()
    .cloned()
    .map(|workspace| (comparable_path(&workspace.path), workspace))
    .collect();

  let mut scanned_projects: Vec<ProjectRecord> = Vec::new();
  let mut scanned_workspaces: Vec<Workspace> = Vec::new();

  for root in &store.roots {
    let (workspaces, projects) = scan_root_hierarchical(root);
    scanned_workspaces.extend(workspaces);
    scanned_projects.extend(projects);
  }

  let mut merged_workspaces: Vec<Workspace> = scanned_workspaces
    .into_iter()
    .map(|workspace| {
      if let Some(existing) = existing_workspaces.get(&comparable_path(&workspace.path)) {
        Workspace {
          id: existing.id.clone(),
          name: workspace.name,
          path: workspace.path,
        }
      } else {
        workspace
      }
    })
    .collect();
  merged_workspaces.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));
  merged_workspaces.dedup_by(|left, right| comparable_path(&left.path) == comparable_path(&right.path));

  let workspace_id_by_path: HashMap<String, String> = merged_workspaces
    .iter()
    .map(|workspace| (comparable_path(&workspace.path), workspace.id.clone()))
    .collect();

  let scanned_projects: Vec<ProjectRecord> = scanned_projects
    .into_iter()
    .map(|mut project| {
      if !project.workspace_id.is_empty() {
        if let Some(id) = workspace_id_by_path.get(&comparable_path(&project.workspace_id)) {
          project.workspace_id = id.clone();
        }
      }
      project
    })
    .collect();

  let scanned_by_path: HashMap<String, ProjectRecord> = scanned_projects
    .into_iter()
    .map(|project| (comparable_path(&project.path), project))
    .collect();

  let scanned_paths: HashSet<String> = scanned_by_path.keys().cloned().collect();
  let mut merged_projects: Vec<ProjectRecord> = scanned_by_path
    .into_values()
    .map(|project| {
      existing_by_path
        .get(&comparable_path(&project.path))
        .map(|existing| merge_scanned_project(existing, project.clone()))
        .unwrap_or(project)
    })
    .collect();

  merged_projects.extend(existing_by_path.into_values().filter(|project| {
    project.source == "manual" && !scanned_paths.contains(&comparable_path(&project.path))
  }));

  merged_projects.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));
  store.projects = merged_projects;
  store.workspaces = merged_workspaces;
  store
}

pub fn preview_root_folder(path: &Path, child_rules: &[RootChildRule]) -> Result<RootFolderPreview, String> {
  if !path.exists() {
    return Err("Selected folder does not exist.".into());
  }

  if !path.is_dir() {
    return Err("Selected path is not a folder.".into());
  }

  let child_rule_by_path: HashMap<String, String> = child_rules
    .iter()
    .map(|rule| (comparable_path(&rule.path), rule.kind.clone()))
    .collect();

  let mut children: Vec<RootChildPreview> = list_visible_child_directories(path)?
    .into_iter()
    .map(|child| {
      let child_entries = read_directory_entries(&child);
      let normalized_path = normalize_path(&child.to_string_lossy());
      let suggested_kind = suggest_root_child_kind(&child, &child_entries);
      let current_kind = child_rule_by_path
        .get(&comparable_path(&normalized_path))
        .cloned()
        .unwrap_or_else(|| suggested_kind.clone());

      RootChildPreview {
        name: get_path_name(&child, "Unnamed folder"),
        path: normalized_path,
        markers: collect_markers(&child, &child_entries),
        suggested_kind,
        current_kind,
        descendant_project_count: count_project_like_children(&child_entries),
      }
    })
    .collect();

  children.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));

  Ok(RootFolderPreview {
    path: normalize_path(&path.to_string_lossy()),
    suggested_label: get_path_name(path, "Main root"),
    children,
  })
}

pub fn inspect_project_path(path: &Path) -> Result<ProjectRecord, String> {
  if !path.exists() {
    return Err("Selected folder does not exist.".into());
  }

  if !path.is_dir() {
    return Err("Selected path is not a folder.".into());
  }

  let entries = read_directory_entries(path);
  let mut project = build_project_or_umbrella(path, &entries);
  project.source = "manual".into();
  Ok(project)
}

fn merge_scanned_project(existing: &ProjectRecord, scanned: ProjectRecord) -> ProjectRecord {
  let stack = if existing.stack.is_empty() {
    scanned.stack.clone()
  } else {
    existing.stack.clone()
  };

  let description = if existing.description.trim().is_empty() {
    scanned.description.clone()
  } else {
    existing.description.clone()
  };

  let client = if existing.client.trim().is_empty() {
    scanned.client.clone()
  } else {
    existing.client.clone()
  };

  ProjectRecord {
    id: existing.id.clone(),
    source: if existing.source == "manual" {
      "manual".into()
    } else {
      "scanned".into()
    },
    name: existing.name.clone(),
    path: scanned.path.clone(),
    description,
    tags: existing.tags.clone(),
    client,
    project_type: if existing.project_type == "other" {
      scanned.project_type.clone()
    } else {
      existing.project_type.clone()
    },
    stack,
    detected_stack: scanned.detected_stack.clone(),
    favorite: existing.favorite,
    last_accessed_at: existing.last_accessed_at.clone(),
    created_at: existing.created_at.clone(),
    updated_at: now_iso(),
    status: existing.status.clone(),
    quick_commands: existing.quick_commands.clone(),
    local_urls: if existing.local_urls.is_empty() {
      scanned.local_urls.clone()
    } else {
      existing.local_urls.clone()
    },
    notes: existing.notes.clone(),
    detected_files: scanned.detected_files.clone(),
    git: scanned.git.clone(),
    path_exists: scanned.path_exists,
    workspace_id: scanned.workspace_id.clone(),
    sub_projects: scanned.sub_projects.clone(),
  }
}

fn scan_root_hierarchical(root: &RootFolder) -> (Vec<Workspace>, Vec<ProjectRecord>) {
  let root_path = PathBuf::from(&root.path);
  if !root_path.exists() {
    return (Vec::new(), Vec::new());
  }

  let Ok(children) = list_visible_child_directories(&root_path) else {
    return (Vec::new(), Vec::new());
  };

  let child_rule_by_path: HashMap<String, String> = root
    .child_rules
    .iter()
    .map(|rule| (comparable_path(&rule.path), rule.kind.clone()))
    .collect();

  let mut workspaces = Vec::new();
  let mut projects = Vec::new();

  for child in &children {
    let child_entries = read_directory_entries(child);
    let child_path = normalize_path(&child.to_string_lossy());
    let child_kind = child_rule_by_path
      .get(&comparable_path(&child_path))
      .cloned()
      .unwrap_or_else(|| suggest_root_child_kind(child, &child_entries));

    match child_kind.as_str() {
      ROOT_KIND_WORKSPACE => {
        let workspace = Workspace {
          id: make_id("ws"),
          name: get_path_name(child, "Unnamed workspace"),
          path: child_path,
        };

        let workspace_path = workspace.path.clone();
        for grandchild in child_entries.iter().filter(|entry| entry.is_dir() && !should_ignore_directory(entry)) {
          let grandchild_entries = read_directory_entries(grandchild);

          if looks_like_project(grandchild, &grandchild_entries) || count_project_like_children(&grandchild_entries) > 0 {
            let mut project = build_project_or_umbrella(grandchild, &grandchild_entries);
            project.workspace_id = workspace_path.clone();
            projects.push(project);
          }
        }

        workspaces.push(workspace);
      }
      ROOT_KIND_PROJECT => {
        let mut project = build_project_or_umbrella(child, &child_entries);
        project.workspace_id = String::new();
        projects.push(project);
      }
      _ => {}
    }
  }

  (workspaces, projects)
}

fn scan_sub_projects(project_path: &Path) -> Vec<SubProject> {
  let Ok(children) = list_visible_child_directories(project_path) else {
    return Vec::new();
  };

  let mut sub_projects = Vec::new();
  for child in &children {
    let child_entries = read_directory_entries(child);
    if looks_like_project(child, &child_entries) {
      sub_projects.push(build_sub_project(child, &child_entries));
    }
  }

  sub_projects
}

fn build_project_or_umbrella(path: &Path, entries: &[PathBuf]) -> ProjectRecord {
  if looks_like_project(path, entries) {
    let mut project = build_project(path, entries);
    project.sub_projects = scan_sub_projects(path);
    return project;
  }

  let sub_projects = scan_sub_projects(path);
  if !sub_projects.is_empty() {
    let mut project = build_umbrella_project(path, &sub_projects);
    project.sub_projects = sub_projects;
    return project;
  }

  build_manual_project(path)
}

fn build_sub_project(path: &Path, entries: &[PathBuf]) -> SubProject {
  let markers = collect_markers(path, entries);
  let detection = detect_stack(path, &markers, entries);

  SubProject {
    name: get_path_name(path, "unnamed"),
    path: normalize_path(&path.to_string_lossy()),
    stack: detection.stack,
    project_type: detection.project_type,
    detected_files: markers,
    git: detect_git(path),
  }
}

fn build_umbrella_project(path: &Path, sub_projects: &[SubProject]) -> ProjectRecord {
  let now = now_iso();

  let mut all_stacks: Vec<String> = sub_projects.iter().flat_map(|sub_project| sub_project.stack.clone()).collect();
  all_stacks.sort();
  all_stacks.dedup();

  let has_frontend = sub_projects.iter().any(|sub_project| sub_project.project_type == "frontend");
  let has_backend = sub_projects
    .iter()
    .any(|sub_project| sub_project.project_type == "backend" || sub_project.project_type == "fullstack");
  let project_type = if has_frontend && has_backend {
    "fullstack".to_string()
  } else if has_frontend {
    "frontend".to_string()
  } else if has_backend {
    "backend".to_string()
  } else {
    "other".to_string()
  };

  let sub_names: Vec<String> = sub_projects.iter().map(|sub_project| sub_project.name.clone()).collect();
  let description = format!("Umbrella project with sub-projects: {}.", sub_names.join(", "));

  ProjectRecord {
    id: make_id("project"),
    source: "scanned".into(),
    name: get_path_name(path, "Unnamed project"),
    path: normalize_path(&path.to_string_lossy()),
    description,
    tags: Vec::new(),
    client: String::new(),
    project_type,
    stack: all_stacks.clone(),
    detected_stack: all_stacks,
    favorite: false,
    last_accessed_at: None,
    created_at: now.clone(),
    updated_at: now,
    status: "active".into(),
    quick_commands: Vec::new(),
    local_urls: Vec::new(),
    notes: Default::default(),
    detected_files: Vec::new(),
    git: detect_git(path),
    path_exists: path.exists(),
    workspace_id: String::new(),
    sub_projects: Vec::new(),
  }
}

fn looks_like_project(path: &Path, entries: &[PathBuf]) -> bool {
  if path.join(".git").exists() {
    return true;
  }

  entries.iter().any(|entry| {
    let Some(name) = entry.file_name().and_then(|value| value.to_str()) else {
      return false;
    };

    matches!(
      name,
      "package.json"
        | "composer.json"
        | "artisan"
        | "Cargo.toml"
        | "pubspec.yaml"
        | "docker-compose.yml"
        | "compose.yml"
        | "go.mod"
        | "pyproject.toml"
        | "requirements.txt"
        | "pnpm-workspace.yaml"
        | "turbo.json"
    ) || name.ends_with(".sln")
      || name.ends_with(".csproj")
      || name.ends_with(".xcodeproj")
      || name.ends_with(".xcworkspace")
  })
}

fn looks_like_workspace(entries: &[PathBuf]) -> bool {
  has_workspace_markers(entries) || count_project_like_children(entries) >= 2
}

fn has_workspace_markers(entries: &[PathBuf]) -> bool {
  entries.iter().any(|entry| {
    let Some(name) = entry.file_name().and_then(|value| value.to_str()) else {
      return false;
    };

    matches!(name, "pnpm-workspace.yaml" | "turbo.json") || name.ends_with(".xcworkspace") || name.ends_with(".sln")
  })
}

fn suggest_root_child_kind(path: &Path, entries: &[PathBuf]) -> String {
  if looks_like_workspace(entries) {
    return ROOT_KIND_WORKSPACE.into();
  }

  if looks_like_project(path, entries) || count_project_like_children(entries) > 0 {
    return ROOT_KIND_PROJECT.into();
  }

  ROOT_KIND_IGNORED.into()
}

fn count_project_like_children(entries: &[PathBuf]) -> usize {
  entries
    .iter()
    .filter(|entry| entry.is_dir() && !should_ignore_directory(entry))
    .filter(|entry| {
      let child_entries = read_directory_entries(entry);
      looks_like_project(entry, &child_entries) || !scan_sub_projects(entry).is_empty()
    })
    .count()
}

fn build_project(path: &Path, entries: &[PathBuf]) -> ProjectRecord {
  let markers = collect_markers(path, entries);
  let detection = detect_stack(path, &markers, entries);
  let now = now_iso();

  ProjectRecord {
    id: make_id("project"),
    source: "scanned".into(),
    name: get_path_name(path, "Unnamed project"),
    path: normalize_path(&path.to_string_lossy()),
    description: detection.description,
    tags: Vec::new(),
    client: String::new(),
    project_type: detection.project_type,
    stack: detection.stack.clone(),
    detected_stack: detection.stack,
    favorite: false,
    last_accessed_at: None,
    created_at: now.clone(),
    updated_at: now,
    status: "active".into(),
    quick_commands: Vec::new(),
    local_urls: detection.local_urls,
    notes: Default::default(),
    detected_files: markers,
    git: detect_git(path),
    path_exists: path.exists(),
    workspace_id: String::new(),
    sub_projects: Vec::new(),
  }
}

fn build_manual_project(path: &Path) -> ProjectRecord {
  let now = now_iso();

  ProjectRecord {
    id: make_id("project"),
    source: "manual".into(),
    name: get_path_name(path, "Unnamed project"),
    path: normalize_path(&path.to_string_lossy()),
    description: String::new(),
    tags: Vec::new(),
    client: String::new(),
    project_type: "other".into(),
    stack: Vec::new(),
    detected_stack: Vec::new(),
    favorite: false,
    last_accessed_at: None,
    created_at: now.clone(),
    updated_at: now,
    status: "active".into(),
    quick_commands: Vec::new(),
    local_urls: Vec::new(),
    notes: Default::default(),
    detected_files: Vec::new(),
    git: detect_git(path),
    path_exists: path.exists(),
    workspace_id: String::new(),
    sub_projects: Vec::new(),
  }
}

fn collect_markers(path: &Path, entries: &[PathBuf]) -> Vec<String> {
  let mut markers: Vec<String> = Vec::new();
  if path.join(".git").exists() {
    markers.push(".git".into());
  }

  markers.extend(
    entries
      .iter()
      .filter_map(|entry| entry.file_name().and_then(|value| value.to_str()).map(String::from))
      .filter(|name| {
        matches!(
          name.as_str(),
          "package.json"
            | "composer.json"
            | "artisan"
            | "Cargo.toml"
            | "pubspec.yaml"
            | "docker-compose.yml"
            | "compose.yml"
            | "go.mod"
            | "pyproject.toml"
            | "requirements.txt"
            | "pnpm-workspace.yaml"
            | "turbo.json"
        ) || name.ends_with(".sln")
          || name.ends_with(".csproj")
          || name.ends_with(".xcodeproj")
          || name.ends_with(".xcworkspace")
      }),
  );

  sanitize_list(&markers)
}

fn read_directory_entries(path: &Path) -> Vec<PathBuf> {
  fs::read_dir(path)
    .ok()
    .map(|entries| entries.filter_map(Result::ok).map(|entry| entry.path()).collect())
    .unwrap_or_default()
}

fn list_visible_child_directories(path: &Path) -> Result<Vec<PathBuf>, String> {
  let entries = fs::read_dir(path).map_err(|error| error.to_string())?;

  Ok(entries
    .filter_map(Result::ok)
    .map(|entry| entry.path())
    .filter(|entry| entry.is_dir() && !should_ignore_directory(entry))
    .collect())
}

fn should_ignore_directory(path: &Path) -> bool {
  let Some(name) = path.file_name().and_then(|value| value.to_str()) else {
    return true;
  };

  IGNORED_DIRECTORIES.contains(&name) || name.starts_with('.')
}

fn get_path_name(path: &Path, fallback: &str) -> String {
  path
    .file_name()
    .and_then(|value| value.to_str())
    .unwrap_or(fallback)
    .to_string()
}

struct Detection {
  stack: Vec<String>,
  project_type: String,
  local_urls: Vec<ProjectUrl>,
  description: String,
}

fn detect_stack(path: &Path, markers: &[String], entries: &[PathBuf]) -> Detection {
  let mut stack: Vec<String> = Vec::new();
  let mut project_type = "other".to_string();
  let mut description = "Imported from a registered root folder.".to_string();

  if markers.iter().any(|marker| marker == "package.json") {
    stack.push("Node".into());
    let package_json = path.join("package.json");
    if let Ok(raw) = fs::read_to_string(package_json) {
      if let Ok(value) = serde_json::from_str::<Value>(&raw) {
        if has_package(&value, "react") {
          stack.push("React".into());
          project_type = "frontend".into();
        }
        if has_package(&value, "vite") {
          stack.push("Vite".into());
        }
        if has_package(&value, "next") {
          stack.push("Next.js".into());
        }
        if has_package(&value, "astro") {
          stack.push("Astro".into());
        }
        if has_package(&value, "express") || has_package(&value, "fastify") || has_package(&value, "nestjs") {
          stack.push("API".into());
          project_type = if project_type == "frontend" { "fullstack".into() } else { "backend".into() };
        }
      }
    }
    description = "Detected from package.json and JavaScript tooling markers.".into();
  }

  if markers.iter().any(|marker| marker == "composer.json") && markers.iter().any(|marker| marker == "artisan") {
    stack.push("Laravel".into());
    project_type = "fullstack".into();
    description = "Laravel application detected from composer.json and artisan.".into();
  }

  if markers.iter().any(|marker| marker == "Cargo.toml") {
    stack.push("Rust".into());
    if project_type == "other" {
      project_type = "script".into();
    }
  }

  if markers.iter().any(|marker| marker == "pubspec.yaml") {
    stack.push("Flutter".into());
    project_type = "mobile".into();
  }

  if markers.iter().any(|marker| marker == "docker-compose.yml" || marker == "compose.yml") {
    stack.push("Docker".into());
  }

  if markers.iter().any(|marker| marker.ends_with(".sln") || marker.ends_with(".csproj")) {
    stack.push(".NET".into());
    if project_type == "other" {
      project_type = "backend".into();
    }
  }

  if entries.iter().any(|entry| entry.file_name().and_then(|value| value.to_str()) == Some("claude.md")) {
    stack.push("Claude".into());
  }

  let stack = sanitize_list(&stack);
  let local_urls = infer_local_urls(&stack);

  Detection {
    stack,
    project_type,
    local_urls,
    description,
  }
}

fn has_package(value: &Value, package_name: &str) -> bool {
  ["dependencies", "devDependencies", "peerDependencies"]
    .iter()
    .filter_map(|key| value.get(*key))
    .filter_map(|field| field.as_object())
    .any(|dependencies| dependencies.contains_key(package_name))
}

fn infer_local_urls(stack: &[String]) -> Vec<ProjectUrl> {
  let mut urls = Vec::new();

  if stack.iter().any(|item| item == "Vite") {
    urls.push(ProjectUrl {
      id: make_id("url"),
      label: "Vite dev".into(),
      url: "http://localhost:5173".into(),
    });
  }

  if stack.iter().any(|item| item == "Laravel") {
    urls.push(ProjectUrl {
      id: make_id("url"),
      label: "Laravel".into(),
      url: "http://localhost:8000".into(),
    });
  }

  if stack.iter().any(|item| item == "Next.js") {
    urls.push(ProjectUrl {
      id: make_id("url"),
      label: "Next.js".into(),
      url: "http://localhost:3000".into(),
    });
  }

  urls
}

fn detect_git(path: &Path) -> ProjectGitInfo {
  let git_entry = path.join(".git");
  if !git_entry.exists() {
    return ProjectGitInfo::default();
  }

  let head_file = if git_entry.is_dir() {
    git_entry.join("HEAD")
  } else if git_entry.is_file() {
    resolve_gitdir_file(path, &git_entry)
      .map(|git_directory| git_directory.join("HEAD"))
      .unwrap_or(git_entry.join("HEAD"))
  } else {
    git_entry.join("HEAD")
  };

  let branch = fs::read_to_string(head_file).ok().and_then(parse_head_branch);

  ProjectGitInfo {
    is_repo: true,
    branch,
    dirty: None,
  }
}

fn resolve_gitdir_file(project_path: &Path, git_file: &Path) -> Option<PathBuf> {
  let contents = fs::read_to_string(git_file).ok()?;
  let relative = contents.trim().strip_prefix("gitdir:")?.trim();
  Some(if Path::new(relative).is_absolute() {
    PathBuf::from(relative)
  } else {
    project_path.join(relative)
  })
}

fn parse_head_branch(raw: String) -> Option<String> {
  let trimmed = raw.trim();
  if let Some(reference) = trimmed.strip_prefix("ref: refs/heads/") {
    return Some(reference.to_string());
  }
  if trimmed.is_empty() {
    None
  } else {
    Some("detached".into())
  }
}
