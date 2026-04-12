use crate::{
  types::ToolIntegration,
  utils::command_exists,
};
#[cfg(target_os = "windows")]
use std::env;
use std::path::PathBuf;

#[derive(Debug, Clone, Copy)]
enum ToolCategory {
  Editor,
  Agent,
  Terminal,
  FileManager,
}

#[derive(Debug, Clone, Copy)]
enum LaunchMethod {
  Command,
  Executable,
  System,
}

#[derive(Debug, Clone, Copy)]
struct ToolDefinition {
  id: &'static str,
  label: &'static str,
  category: ToolCategory,
  brand: &'static str,
  commands: &'static [&'static str],
  mac_apps: &'static [&'static str],
  #[cfg_attr(not(target_os = "windows"), allow(dead_code))]
  windows_paths: &'static [&'static str],
  system_available: bool,
}

#[cfg(target_os = "windows")]
const EDITOR_DEFINITIONS: &[ToolDefinition] = &[
  ToolDefinition {
    id: "vscode",
    label: "VS Code",
    category: ToolCategory::Editor,
    brand: "vscode",
    commands: &["code"],
    mac_apps: &[],
    windows_paths: &[
      "%LOCALAPPDATA%\\Programs\\Microsoft VS Code\\Code.exe",
      "%PROGRAMFILES%\\Microsoft VS Code\\Code.exe",
      "%PROGRAMFILES(X86)%\\Microsoft VS Code\\Code.exe",
    ],
    system_available: false,
  },
  ToolDefinition {
    id: "cursor",
    label: "Cursor",
    category: ToolCategory::Editor,
    brand: "cursor",
    commands: &["cursor"],
    mac_apps: &[],
    windows_paths: &[
      "%LOCALAPPDATA%\\Programs\\Cursor\\Cursor.exe",
      "%LOCALAPPDATA%\\Programs\\cursor\\Cursor.exe",
      "%PROGRAMFILES%\\Cursor\\Cursor.exe",
    ],
    system_available: false,
  },
  ToolDefinition {
    id: "antigravity",
    label: "Antigravity",
    category: ToolCategory::Editor,
    brand: "antigravity",
    commands: &["antigravity"],
    mac_apps: &[],
    windows_paths: &[
      "%LOCALAPPDATA%\\Programs\\Antigravity\\Antigravity.exe",
      "%LOCALAPPDATA%\\Programs\\Google\\Antigravity\\Antigravity.exe",
      "%PROGRAMFILES%\\Google\\Antigravity\\Antigravity.exe",
      "%PROGRAMFILES%\\Antigravity\\Antigravity.exe",
    ],
    system_available: false,
  },
];

#[cfg(not(target_os = "windows"))]
const EDITOR_DEFINITIONS: &[ToolDefinition] = &[
  ToolDefinition {
    id: "vscode",
    label: "VS Code",
    category: ToolCategory::Editor,
    brand: "vscode",
    commands: &["code"],
    mac_apps: &["/Applications/Visual Studio Code.app"],
    windows_paths: &[],
    system_available: false,
  },
  ToolDefinition {
    id: "cursor",
    label: "Cursor",
    category: ToolCategory::Editor,
    brand: "cursor",
    commands: &["cursor"],
    mac_apps: &["/Applications/Cursor.app"],
    windows_paths: &[],
    system_available: false,
  },
  ToolDefinition {
    id: "antigravity",
    label: "Antigravity",
    category: ToolCategory::Editor,
    brand: "antigravity",
    commands: &["antigravity"],
    mac_apps: &["/Applications/Antigravity.app", "/Applications/Google Antigravity.app"],
    windows_paths: &[],
    system_available: false,
  },
];

const AGENT_DEFINITIONS: &[ToolDefinition] = &[
  ToolDefinition {
    id: "claude",
    label: "Claude",
    category: ToolCategory::Agent,
    brand: "claude",
    commands: &["claude"],
    mac_apps: &[],
    windows_paths: &[],
    system_available: false,
  },
  ToolDefinition {
    id: "codex",
    label: "Codex",
    category: ToolCategory::Agent,
    brand: "codex",
    commands: &["codex"],
    mac_apps: &[],
    windows_paths: &[],
    system_available: false,
  },
  ToolDefinition {
    id: "gemini",
    label: "Gemini CLI",
    category: ToolCategory::Agent,
    brand: "gemini",
    commands: &["gemini"],
    mac_apps: &[],
    windows_paths: &[],
    system_available: false,
  },
  ToolDefinition {
    id: "opencode",
    label: "OpenCode",
    category: ToolCategory::Agent,
    brand: "opencode",
    commands: &["opencode"],
    mac_apps: &[],
    windows_paths: &[],
    system_available: false,
  },
];

pub fn detect_integrations() -> Vec<ToolIntegration> {
  let mut integrations = vec![file_manager_integration(), terminal_integration()];
  integrations.extend(EDITOR_DEFINITIONS.iter().map(detect_definition));
  integrations.extend(AGENT_DEFINITIONS.iter().map(detect_definition));
  integrations
}

pub fn find_installed_integration(id: &str) -> Option<ToolIntegration> {
  detect_integrations()
    .into_iter()
    .find(|integration| integration.id == id && integration.installed)
}

fn detect_definition(definition: &ToolDefinition) -> ToolIntegration {
  if let Some(command) = definition.commands.iter().find(|command| command_exists(command)) {
    return build_integration(definition, true, LaunchMethod::Command, Some((*command).into()), None, None);
  }

  if let Some(path) = app_path(definition) {
    return build_integration(definition, true, LaunchMethod::Executable, None, Some(path), None);
  }

  build_integration(
    definition,
    definition.system_available,
    LaunchMethod::System,
    None,
    None,
    Some("Not found on this machine.".into()),
  )
}

fn build_integration(
  definition: &ToolDefinition,
  installed: bool,
  launch_method: LaunchMethod,
  command: Option<String>,
  executable_path: Option<String>,
  reason: Option<String>,
) -> ToolIntegration {
  ToolIntegration {
    id: definition.id.into(),
    label: definition.label.into(),
    category: category_name(definition.category).into(),
    brand: definition.brand.into(),
    installed,
    launch_method: launch_method_name(launch_method).into(),
    command,
    executable_path,
    reason,
  }
}

fn file_manager_integration() -> ToolIntegration {
  ToolIntegration {
    id: "fileManager".into(),
    label: file_manager_label().into(),
    category: category_name(ToolCategory::FileManager).into(),
    brand: "fileManager".into(),
    installed: true,
    launch_method: launch_method_name(LaunchMethod::System).into(),
    command: None,
    executable_path: None,
    reason: None,
  }
}

fn terminal_integration() -> ToolIntegration {
  #[cfg(target_os = "windows")]
  {
    let command = if command_exists("wt") { "wt" } else { "powershell" };
    return ToolIntegration {
      id: "terminal".into(),
      label: if command == "wt" { "Windows Terminal" } else { "PowerShell" }.into(),
      category: category_name(ToolCategory::Terminal).into(),
      brand: "terminal".into(),
      installed: command_exists(command) || command == "powershell",
      launch_method: launch_method_name(LaunchMethod::Command).into(),
      command: Some(command.into()),
      executable_path: None,
      reason: None,
    };
  }

  #[cfg(target_os = "macos")]
  {
    let label = if command_exists("warp") {
      "Warp"
    } else if std::path::Path::new("/Applications/iTerm.app").exists() {
      "iTerm"
    } else {
      "Terminal.app"
    };
    return ToolIntegration {
      id: "terminal".into(),
      label: label.into(),
      category: category_name(ToolCategory::Terminal).into(),
      brand: "terminal".into(),
      installed: true,
      launch_method: launch_method_name(LaunchMethod::System).into(),
      command: None,
      executable_path: None,
      reason: None,
    };
  }

  #[cfg(not(any(target_os = "macos", target_os = "windows")))]
  ToolIntegration {
    id: "terminal".into(),
    label: "Terminal".into(),
    category: category_name(ToolCategory::Terminal).into(),
    brand: "terminal".into(),
    installed: false,
    launch_method: launch_method_name(LaunchMethod::System).into(),
    command: None,
    executable_path: None,
    reason: Some("Unsupported platform.".into()),
  }
}

fn file_manager_label() -> &'static str {
  #[cfg(target_os = "windows")]
  {
    "Explorer"
  }

  #[cfg(target_os = "macos")]
  {
    "Finder"
  }

  #[cfg(not(any(target_os = "macos", target_os = "windows")))]
  {
    "File manager"
  }
}

fn category_name(category: ToolCategory) -> &'static str {
  match category {
    ToolCategory::Editor => "editor",
    ToolCategory::Agent => "agent",
    ToolCategory::Terminal => "terminal",
    ToolCategory::FileManager => "fileManager",
  }
}

fn launch_method_name(method: LaunchMethod) -> &'static str {
  match method {
    LaunchMethod::Command => "command",
    LaunchMethod::Executable => "executable",
    LaunchMethod::System => "system",
  }
}

fn app_path(definition: &ToolDefinition) -> Option<String> {
  #[cfg(target_os = "windows")]
  {
    return definition
      .windows_paths
      .iter()
      .filter_map(expand_windows_path)
      .find(|path| path.exists())
      .map(|path| path.to_string_lossy().into_owned());
  }

  #[cfg(target_os = "macos")]
  {
    return definition
      .mac_apps
      .iter()
      .map(PathBuf::from)
      .find(|path| path.exists())
      .map(|path| path.to_string_lossy().into_owned());
  }

  #[cfg(not(any(target_os = "macos", target_os = "windows")))]
  {
    let _ = definition;
    None
  }
}

#[cfg(target_os = "windows")]
fn expand_windows_path(template: &&str) -> Option<PathBuf> {
  let mut value = (*template).to_string();
  for key in ["LOCALAPPDATA", "PROGRAMFILES", "PROGRAMFILES(X86)"] {
    let token = format!("%{key}%");
    if value.contains(&token) {
      let replacement = env::var(key).ok()?;
      value = value.replace(&token, &replacement);
    }
  }
  Some(PathBuf::from(value))
}
