use crate::{
  project_actions, scanner,
  storage::{self, maybe_seed_default_roots, sanitize_project, sanitize_root},
  types::{ActionResult, AppStore, Preferences, ProjectActionPayload, ProjectRecord, RootFolder},
};
use tauri::{AppHandle, State};

pub struct AppState {
  pub lock: std::sync::Mutex<()>,
}

#[tauri::command]
pub fn load_app_state(app: AppHandle, state: State<AppState>) -> Result<AppStore, String> {
  let _guard = state.lock.lock().map_err(|_| "App state lock is poisoned.")?;
  let mut store = storage::load_store(&app)?;
  let had_roots = !store.roots.is_empty();
  maybe_seed_default_roots(&mut store);

  if !had_roots && !store.roots.is_empty() {
    store = scanner::scan_store(store);
    storage::save_store(&app, &store)?;
  }

  Ok(store)
}

#[tauri::command]
pub fn scan_projects(app: AppHandle, state: State<AppState>) -> Result<AppStore, String> {
  let _guard = state.lock.lock().map_err(|_| "App state lock is poisoned.")?;
  let mut store = storage::load_store(&app)?;
  maybe_seed_default_roots(&mut store);
  store = scanner::scan_store(store);
  storage::save_store(&app, &store)?;
  Ok(store)
}

#[tauri::command]
pub fn inspect_project_path(state: State<AppState>, path: String) -> Result<ProjectRecord, String> {
  let _guard = state.lock.lock().map_err(|_| "App state lock is poisoned.")?;
  let project_path = std::path::Path::new(&path);
  scanner::inspect_project_path(project_path)
}

#[tauri::command]
pub fn save_project(app: AppHandle, state: State<AppState>, project: ProjectRecord) -> Result<AppStore, String> {
  let _guard = state.lock.lock().map_err(|_| "App state lock is poisoned.")?;
  let mut store = storage::load_store(&app)?;
  let project = sanitize_project(&project)?;

  if storage::has_project_with_path(&store, &project.path, &project.id) {
    return Err("DUPLICATE_PROJECT_PATH".into());
  }

  if let Some(existing) = store.projects.iter_mut().find(|item| item.id == project.id) {
    *existing = project;
  } else {
    store.projects.push(project);
  }

  storage::save_store(&app, &store)?;
  Ok(store)
}

#[tauri::command]
pub fn delete_project(app: AppHandle, state: State<AppState>, project_id: String) -> Result<AppStore, String> {
  let _guard = state.lock.lock().map_err(|_| "App state lock is poisoned.")?;
  let mut store = storage::load_store(&app)?;
  store.projects.retain(|project| project.id != project_id);
  storage::save_store(&app, &store)?;
  Ok(store)
}

#[tauri::command]
pub fn save_root_folder(app: AppHandle, state: State<AppState>, root: RootFolder) -> Result<AppStore, String> {
  let _guard = state.lock.lock().map_err(|_| "App state lock is poisoned.")?;
  let mut store = storage::load_store(&app)?;
  let root = sanitize_root(&root, store.preferences.root_scan_depth)?;

  if let Some(existing) = store.roots.iter_mut().find(|item| item.id == root.id) {
    *existing = root;
  } else {
    store.roots.push(root);
  }

  store = scanner::scan_store(store);
  storage::save_store(&app, &store)?;
  Ok(store)
}

#[tauri::command]
pub fn delete_root_folder(app: AppHandle, state: State<AppState>, root_id: String) -> Result<AppStore, String> {
  let _guard = state.lock.lock().map_err(|_| "App state lock is poisoned.")?;
  let mut store = storage::load_store(&app)?;
  store.roots.retain(|root| root.id != root_id);
  store = scanner::scan_store(store);
  storage::save_store(&app, &store)?;
  Ok(store)
}

#[tauri::command]
pub fn save_preferences(app: AppHandle, state: State<AppState>, preferences: Preferences) -> Result<AppStore, String> {
  let _guard = state.lock.lock().map_err(|_| "App state lock is poisoned.")?;
  let mut store = storage::load_store(&app)?;
  store.preferences = preferences;
  storage::save_store(&app, &store)?;
  Ok(store)
}

#[tauri::command]
pub fn run_project_action(
  app: AppHandle,
  state: State<AppState>,
  project_id: String,
  action: ProjectActionPayload,
) -> Result<ActionResult, String> {
  let _guard = state.lock.lock().map_err(|_| "App state lock is poisoned.")?;
  let mut store = storage::load_store(&app)?;
  let result = project_actions::run_project_action(&mut store, &project_id, action)?;
  storage::save_store(&app, &store)?;
  Ok(result)
}
