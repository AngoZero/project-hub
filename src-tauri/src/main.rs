mod commands;
mod project_actions;
mod scanner;
mod storage;
mod types;
mod utils;

use commands::AppState;

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .manage(AppState {
      lock: std::sync::Mutex::new(()),
    })
    .invoke_handler(tauri::generate_handler![
      commands::load_app_state,
      commands::scan_projects,
      commands::preview_root_folder,
      commands::inspect_project_path,
      commands::save_project,
      commands::delete_project,
      commands::save_root_folder,
      commands::delete_root_folder,
      commands::save_preferences,
      commands::run_project_action,
    ])
    .run(tauri::generate_context!())
    .expect("error while running Project Hub");
}
