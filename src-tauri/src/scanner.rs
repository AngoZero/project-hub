use crate::types::{AppStore, ProjectGitInfo, ProjectRecord, ProjectUrl, RootFolder, SubProject, Workspace};
use crate::utils::{make_id, now_iso, sanitize_list};
use serde_json::Value;
use std::{
  collections::HashMap,
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

/// Hierarchical scan: Root → Workspace → Project → SubProject
pub fn scan_store(mut store: AppStore) -> AppStore {
  let existing_by_path: HashMap<String, ProjectRecord> = store
    .projects
    .iter()
    .cloned()
    .map(|project| (project.path.clone(), project))
    .collect();

  let existing_workspaces: HashMap<String, Workspace> = store
    .workspaces
    .iter()
    .cloned()
    .map(|ws| (ws.path.clone(), ws))
    .collect();

  let mut scanned_projects: Vec<ProjectRecord> = Vec::new();
  let mut scanned_workspaces: Vec<Workspace> = Vec::new();

  for root in &store.roots {
    let (workspaces, projects) = scan_root_hierarchical(root);
    scanned_workspaces.extend(workspaces);
    scanned_projects.extend(projects);
  }

  // Merge workspaces: preserve existing IDs
  let mut merged_workspaces: Vec<Workspace> = scanned_workspaces
    .into_iter()
    .map(|ws| {
      if let Some(existing) = existing_workspaces.get(&ws.path) {
        Workspace {
          id: existing.id.clone(),
          name: ws.name,
          path: ws.path,
        }
      } else {
        ws
      }
    })
    .collect();
  merged_workspaces.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
  merged_workspaces.dedup_by(|a, b| a.path == b.path);

  // Build workspace ID lookup for projects
  let workspace_id_by_path: HashMap<String, String> = merged_workspaces
    .iter()
    .map(|ws| (ws.path.clone(), ws.id.clone()))
    .collect();

  // Resolve workspace IDs on scanned projects
  let scanned_projects: Vec<ProjectRecord> = scanned_projects
    .into_iter()
    .map(|mut project| {
      if !project.workspace_id.is_empty() {
        // workspace_id is set to the workspace path during scanning, resolve to ID
        if let Some(id) = workspace_id_by_path.get(&project.workspace_id) {
          project.workspace_id = id.clone();
        }
      }
      project
    })
    .collect();

  // Merge projects
  let scanned_by_path: HashMap<String, ProjectRecord> = scanned_projects
    .into_iter()
    .map(|project| (project.path.clone(), project))
    .collect();

  let scanned_paths: Vec<String> = scanned_by_path.keys().cloned().collect();
  let mut merged_projects: Vec<ProjectRecord> = scanned_by_path
    .into_values()
    .map(|project| {
      existing_by_path
        .get(&project.path)
        .map(|existing| merge_scanned_project(existing, project.clone()))
        .unwrap_or(project)
    })
    .collect();

  merged_projects.extend(
    existing_by_path
      .into_values()
      .filter(|project| project.source == "manual" && !scanned_paths.contains(&project.path)),
  );

  merged_projects.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));
  store.projects = merged_projects;
  store.workspaces = merged_workspaces;
  store
}

pub fn inspect_project_path(path: &Path) -> Result<ProjectRecord, String> {
  if !path.exists() {
    return Err("Selected folder does not exist.".into());
  }

  if !path.is_dir() {
    return Err("Selected path is not a folder.".into());
  }

  let entries: Vec<PathBuf> = fs::read_dir(path)
    .map_err(|error| error.to_string())?
    .filter_map(Result::ok)
    .map(|entry| entry.path())
    .collect();

  let mut project = if looks_like_project(path, &entries) {
    build_project(path, &entries)
  } else {
    let subs = scan_sub_projects(path);
    if !subs.is_empty() {
      let mut project = build_umbrella_project(path, &subs);
      project.sub_projects = subs;
      project
    } else {
      build_manual_project(path)
    }
  };

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

/// Scan a root folder hierarchically: children are workspaces, grandchildren are projects
fn scan_root_hierarchical(root: &RootFolder) -> (Vec<Workspace>, Vec<ProjectRecord>) {
  let root_path = PathBuf::from(&root.path);
  if !root_path.exists() {
    return (Vec::new(), Vec::new());
  }

  let Ok(entries) = fs::read_dir(&root_path) else {
    return (Vec::new(), Vec::new());
  };

  let children: Vec<PathBuf> = entries
    .filter_map(Result::ok)
    .map(|e| e.path())
    .filter(|p| p.is_dir())
    .collect();

  let mut workspaces = Vec::new();
  let mut projects = Vec::new();

  for child in &children {
    let Some(name) = child.file_name().and_then(|v| v.to_str()) else {
      continue;
    };

    if IGNORED_DIRECTORIES.contains(&name) || name.starts_with('.') {
      continue;
    }

    let child_entries: Vec<PathBuf> = fs::read_dir(child)
      .ok()
      .map(|rd| rd.filter_map(Result::ok).map(|e| e.path()).collect())
      .unwrap_or_default();

    if looks_like_project(child, &child_entries) {
      // This child is itself a project (directly in root, no workspace)
      let mut project = build_project(child, &child_entries);
      project.workspace_id = String::new();
      project.sub_projects = scan_sub_projects(child);
      projects.push(project);
    } else {
      // This child is a workspace — enumerate its children as projects
      let workspace = Workspace {
        id: make_id("ws"),
        name: name.to_string(),
        path: child.to_string_lossy().to_string(),
      };

      let ws_path = workspace.path.clone();

      for grandchild in child_entries.iter().filter(|p| p.is_dir()) {
        let Some(gc_name) = grandchild.file_name().and_then(|v| v.to_str()) else {
          continue;
        };

        if IGNORED_DIRECTORIES.contains(&gc_name) || gc_name.starts_with('.') {
          continue;
        }

        let gc_entries: Vec<PathBuf> = fs::read_dir(grandchild)
          .ok()
          .map(|rd| rd.filter_map(Result::ok).map(|e| e.path()).collect())
          .unwrap_or_default();

        if looks_like_project(grandchild, &gc_entries) {
          let mut project = build_project(grandchild, &gc_entries);
          project.workspace_id = ws_path.clone();
          project.sub_projects = scan_sub_projects(grandchild);
          projects.push(project);
        } else {
          // Check if this is an umbrella folder containing sub-projects
          let subs = scan_sub_projects(grandchild);
          if !subs.is_empty() {
            let mut project = build_umbrella_project(grandchild, &subs);
            project.workspace_id = ws_path.clone();
            project.sub_projects = subs;
            projects.push(project);
          }
        }
      }

      workspaces.push(workspace);
    }
  }

  (workspaces, projects)
}

/// Scan immediate subdirectories of a project for sub-projects
fn scan_sub_projects(project_path: &Path) -> Vec<SubProject> {
  let Ok(entries) = fs::read_dir(project_path) else {
    return Vec::new();
  };

  let children: Vec<PathBuf> = entries
    .filter_map(Result::ok)
    .map(|e| e.path())
    .filter(|p| p.is_dir())
    .collect();

  let mut subs = Vec::new();

  for child in &children {
    let Some(name) = child.file_name().and_then(|v| v.to_str()) else {
      continue;
    };

    if IGNORED_DIRECTORIES.contains(&name) || name.starts_with('.') {
      continue;
    }

    let child_entries: Vec<PathBuf> = fs::read_dir(child)
      .ok()
      .map(|rd| rd.filter_map(Result::ok).map(|e| e.path()).collect())
      .unwrap_or_default();

    if looks_like_project(child, &child_entries) {
      subs.push(build_sub_project(child, &child_entries));
    }
  }

  subs
}

fn build_sub_project(path: &Path, entries: &[PathBuf]) -> SubProject {
  let markers = collect_markers(path, entries);
  let detection = detect_stack(path, &markers, entries);

  SubProject {
    name: path
      .file_name()
      .and_then(|v| v.to_str())
      .unwrap_or("unnamed")
      .to_string(),
    path: path.to_string_lossy().to_string(),
    stack: detection.stack,
    project_type: detection.project_type,
    detected_files: markers,
    git: detect_git(path),
  }
}

/// Build a project from an umbrella folder that has no markers but contains sub-projects
fn build_umbrella_project(path: &Path, subs: &[SubProject]) -> ProjectRecord {
  let now = now_iso();

  // Aggregate stack and type from sub-projects
  let mut all_stacks: Vec<String> = subs.iter().flat_map(|s| s.stack.clone()).collect();
  all_stacks.sort();
  all_stacks.dedup();

  let has_frontend = subs.iter().any(|s| s.project_type == "frontend");
  let has_backend = subs.iter().any(|s| s.project_type == "backend" || s.project_type == "fullstack");
  let project_type = if has_frontend && has_backend {
    "fullstack".to_string()
  } else if has_frontend {
    "frontend".to_string()
  } else if has_backend {
    "backend".to_string()
  } else {
    "other".to_string()
  };

  let sub_names: Vec<String> = subs.iter().map(|s| s.name.clone()).collect();
  let description = format!("Umbrella project with sub-projects: {}.", sub_names.join(", "));

  ProjectRecord {
    id: make_id("project"),
    source: "scanned".into(),
    name: path
      .file_name()
      .and_then(|v| v.to_str())
      .unwrap_or("Unnamed project")
      .to_string(),
    path: path.to_string_lossy().to_string(),
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

fn build_project(path: &Path, entries: &[PathBuf]) -> ProjectRecord {
  let markers = collect_markers(path, entries);
  let detection = detect_stack(path, &markers, entries);
  let now = now_iso();

  ProjectRecord {
    id: make_id("project"),
    source: "scanned".into(),
    name: path
      .file_name()
      .and_then(|value| value.to_str())
      .unwrap_or("Unnamed project")
      .to_string(),
    path: path.to_string_lossy().to_string(),
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
    name: path
      .file_name()
      .and_then(|value| value.to_str())
      .unwrap_or("Unnamed project")
      .to_string(),
    path: path.to_string_lossy().to_string(),
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
