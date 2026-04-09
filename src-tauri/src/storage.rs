use crate::types::{AppStore, ProjectRecord, RootChildRule, RootFolder};
use crate::utils::{comparable_path, is_absolute_path, make_id, normalize_path, now_iso, sanitize_list};
use std::{
  fs,
  path::PathBuf,
};
use tauri::{AppHandle, Manager};

const APP_DIRECTORY: &str = "project-hub";
const STORE_FILENAME: &str = "state.json";

fn store_directory(app: &AppHandle) -> Result<PathBuf, String> {
  let base = app.path().app_data_dir().map_err(|error| error.to_string())?;
  Ok(base.join(APP_DIRECTORY))
}

fn store_path(app: &AppHandle) -> Result<PathBuf, String> {
  Ok(store_directory(app)?.join(STORE_FILENAME))
}

pub fn load_store(app: &AppHandle) -> Result<AppStore, String> {
  let path = store_path(app)?;

  if !path.exists() {
    return Ok(AppStore::default());
  }

  let raw = fs::read_to_string(path).map_err(|error| error.to_string())?;
  let store = serde_json::from_str::<AppStore>(&raw).map_err(|error| error.to_string())?;
  Ok(store)
}

pub fn save_store(app: &AppHandle, store: &AppStore) -> Result<(), String> {
  let directory = store_directory(app)?;
  fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
  let payload = serde_json::to_string_pretty(store).map_err(|error| error.to_string())?;
  fs::write(directory.join(STORE_FILENAME), payload).map_err(|error| error.to_string())
}

pub fn sanitize_root(root: &RootFolder, default_depth: u8) -> Result<RootFolder, String> {
  let path = normalize_path(&root.path);
  if !is_absolute_path(&path) {
    return Err("Root folder path must be absolute.".into());
  }

  let label = root.label.trim().to_string();
  let max_depth = if root.max_depth == 0 { default_depth } else { root.max_depth }.clamp(1, 6);

  Ok(RootFolder {
    id: if root.id.trim().is_empty() { make_id("root") } else { root.id.clone() },
    path,
    label,
    max_depth,
    created_at: if root.created_at.trim().is_empty() {
      now_iso()
    } else {
      root.created_at.clone()
    },
    child_rules: sanitize_root_child_rules(&root.child_rules),
  })
}

pub fn sanitize_project(project: &ProjectRecord) -> Result<ProjectRecord, String> {
  let path = normalize_path(&project.path);
  if !is_absolute_path(&path) {
    return Err("Project path must be absolute.".into());
  }

  if project.name.trim().is_empty() {
    return Err("Project name is required.".into());
  }

  for command in &project.quick_commands {
    if command.command.contains('\n') || command.command.trim().is_empty() {
      return Err("Quick commands must be single-line shell commands.".into());
    }
  }

  Ok(ProjectRecord {
    id: if project.id.trim().is_empty() {
      make_id("project")
    } else {
      project.id.clone()
    },
    source: if project.source.trim().is_empty() {
      "manual".into()
    } else {
      project.source.clone()
    },
    name: project.name.trim().to_string(),
    path: path.clone(),
    description: project.description.trim().to_string(),
    tags: sanitize_list(&project.tags),
    client: project.client.trim().to_string(),
    project_type: project.project_type.clone(),
    stack: sanitize_list(&project.stack),
    detected_stack: sanitize_list(&project.detected_stack),
    favorite: project.favorite,
    last_accessed_at: project.last_accessed_at.clone(),
    created_at: if project.created_at.trim().is_empty() {
      now_iso()
    } else {
      project.created_at.clone()
    },
    updated_at: now_iso(),
    status: project.status.clone(),
    quick_commands: project.quick_commands.clone(),
    local_urls: project.local_urls.clone(),
    notes: project.notes.clone(),
    detected_files: sanitize_list(&project.detected_files),
    git: project.git.clone(),
    path_exists: std::path::Path::new(&path).exists(),
    workspace_id: project.workspace_id.clone(),
    sub_projects: project.sub_projects.clone(),
  })
}

pub fn has_project_with_path(store: &AppStore, path: &str, current_id: &str) -> bool {
  let normalized = comparable_path(path);
  store
    .projects
    .iter()
    .any(|project| comparable_path(&project.path) == normalized && project.id != current_id)
}

fn sanitize_root_child_rules(rules: &[RootChildRule]) -> Vec<RootChildRule> {
  let mut cleaned: Vec<RootChildRule> = rules
    .iter()
    .filter_map(|rule| {
      let path = normalize_path(&rule.path);
      if path.is_empty() || !is_absolute_path(&path) {
        return None;
      }

      let kind = match rule.kind.as_str() {
        "workspace" | "project" | "ignored" => rule.kind.clone(),
        _ => return None,
      };

      Some(RootChildRule { path, kind })
    })
    .collect();

  cleaned.sort_by(|left, right| comparable_path(&left.path).cmp(&comparable_path(&right.path)));
  cleaned.dedup_by(|left, right| comparable_path(&left.path) == comparable_path(&right.path));
  cleaned
}
