use crate::{
  types::{ToolIntegration, ToolOverride},
  utils::{command_exists, resolve_command_path},
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

#[derive(Debug, Clone)]
struct IntegrationResolution {
  installed: bool,
  launch_method: LaunchMethod,
  command: Option<String>,
  executable_path: Option<String>,
  reason: Option<String>,
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

pub fn detect_integrations(overrides: &[ToolOverride]) -> Vec<ToolIntegration> {
  let mut integrations = vec![file_manager_integration(), terminal_integration()];
  integrations.extend(EDITOR_DEFINITIONS.iter().map(|definition| detect_definition(definition, overrides)));
  integrations.extend(AGENT_DEFINITIONS.iter().map(|definition| detect_definition(definition, overrides)));
  integrations
}

pub fn find_installed_integration(overrides: &[ToolOverride], id: &str) -> Option<ToolIntegration> {
  detect_integrations(overrides)
    .into_iter()
    .find(|integration| integration.id == id && integration.installed)
}

fn detect_definition(definition: &ToolDefinition, overrides: &[ToolOverride]) -> ToolIntegration {
  let detected = detect_definition_installation(definition);
  let integration = build_integration(
    definition,
    detected.installed,
    "detected",
    detected.launch_method,
    detected.command.clone(),
    detected.executable_path.clone(),
    detected.command.clone(),
    detected.executable_path.clone(),
    detected.reason.clone(),
  );

  if let Some(override_item) = overrides.iter().find(|override_item| override_item.tool_id == definition.id && override_item.enabled) {
    return apply_override(definition, integration, override_item);
  }

  integration
}

fn detect_definition_installation(definition: &ToolDefinition) -> IntegrationResolution {
  if let Some(command) = definition.commands.iter().find_map(|command| resolve_command_path(command)) {
    return IntegrationResolution {
      installed: true,
      launch_method: LaunchMethod::Command,
      command: Some(command),
      executable_path: None,
      reason: None,
    };
  }

  if let Some(path) = app_path(definition) {
    return IntegrationResolution {
      installed: true,
      launch_method: LaunchMethod::Executable,
      command: None,
      executable_path: Some(path),
      reason: None,
    };
  }

  IntegrationResolution {
    installed: definition.system_available,
    launch_method: LaunchMethod::System,
    command: None,
    executable_path: None,
    reason: Some("Not found on this machine.".into()),
  }
}

fn apply_override(definition: &ToolDefinition, integration: ToolIntegration, override_item: &ToolOverride) -> ToolIntegration {
  let resolution = match override_item.launch_method.as_str() {
    "command" => {
      let configured_command = override_item.command.clone().filter(|value| !value.trim().is_empty());
      let resolved_command = configured_command
        .as_deref()
        .and_then(resolve_command_path)
        .or(configured_command.clone());

      IntegrationResolution {
        installed: configured_command.as_deref().and_then(resolve_command_path).is_some(),
        launch_method: LaunchMethod::Command,
        command: resolved_command,
        executable_path: None,
        reason: if configured_command.is_some() {
          Some("Manual command could not be resolved.".into())
        } else {
          Some("Manual command is required.".into())
        },
      }
    }
    "executable" => {
      let configured_path = override_item.executable_path.clone().filter(|value| !value.trim().is_empty());
      let installed = configured_path
        .as_deref()
        .map(|value| PathBuf::from(value).exists())
        .unwrap_or(false);

      IntegrationResolution {
        installed,
        launch_method: LaunchMethod::Executable,
        command: None,
        executable_path: configured_path,
        reason: if installed {
          None
        } else {
          Some("Manual executable path was not found.".into())
        },
      }
    }
    _ => detected_to_manual_fallback(&integration),
  };

  build_integration(
    definition,
    resolution.installed,
    "manual",
    resolution.launch_method,
    resolution.command,
    resolution.executable_path,
    integration.detected_command,
    integration.detected_executable_path,
    if resolution.installed { None } else { resolution.reason },
  )
}

fn detected_to_manual_fallback(integration: &ToolIntegration) -> IntegrationResolution {
  IntegrationResolution {
    installed: integration.installed,
    launch_method: launch_method_from_name(&integration.launch_method),
    command: integration.command.clone(),
    executable_path: integration.executable_path.clone(),
    reason: integration.reason.clone(),
  }
}

fn build_integration(
  definition: &ToolDefinition,
  installed: bool,
  source: &str,
  launch_method: LaunchMethod,
  command: Option<String>,
  executable_path: Option<String>,
  detected_command: Option<String>,
  detected_executable_path: Option<String>,
  reason: Option<String>,
) -> ToolIntegration {
  ToolIntegration {
    id: definition.id.into(),
    label: definition.label.into(),
    category: category_name(definition.category).into(),
    brand: definition.brand.into(),
    installed,
    source: source.into(),
    launch_method: launch_method_name(launch_method).into(),
    command,
    executable_path,
    detected_command,
    detected_executable_path,
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
    source: "system".into(),
    launch_method: launch_method_name(LaunchMethod::System).into(),
    command: None,
    executable_path: None,
    detected_command: None,
    detected_executable_path: None,
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
      source: "system".into(),
      launch_method: launch_method_name(LaunchMethod::Command).into(),
      command: Some(command.into()),
      executable_path: None,
      detected_command: Some(command.into()),
      detected_executable_path: None,
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
      source: "system".into(),
      launch_method: launch_method_name(LaunchMethod::System).into(),
      command: None,
      executable_path: None,
      detected_command: None,
      detected_executable_path: None,
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
    source: "system".into(),
    launch_method: launch_method_name(LaunchMethod::System).into(),
    command: None,
    executable_path: None,
    detected_command: None,
    detected_executable_path: None,
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

fn launch_method_from_name(method: &str) -> LaunchMethod {
  match method {
    "command" => LaunchMethod::Command,
    "executable" => LaunchMethod::Executable,
    _ => LaunchMethod::System,
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
