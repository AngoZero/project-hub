use chrono::Utc;
use std::{
  env,
  path::Path,
  process::Command,
};
use uuid::Uuid;

pub fn now_iso() -> String {
  Utc::now().to_rfc3339()
}

pub fn make_id(prefix: &str) -> String {
  format!("{prefix}-{}", Uuid::new_v4().simple())
}

pub fn sanitize_list(items: &[String]) -> Vec<String> {
  let mut cleaned: Vec<String> = items
    .iter()
    .map(|item| item.trim())
    .filter(|item| !item.is_empty())
    .map(String::from)
    .collect();
  cleaned.sort();
  cleaned.dedup();
  cleaned
}

pub fn normalize_path(path: &str) -> String {
  let trimmed = path.trim();

  #[cfg(target_os = "windows")]
  {
    let normalized = trimmed.replace('/', "\\");
    if is_windows_drive_root(&normalized) {
      return normalized;
    }

    return normalized.trim_end_matches(['\\', '/']).to_string();
  }

  #[cfg(not(target_os = "windows"))]
  trimmed.trim_end_matches('/').to_string()
}

pub fn comparable_path(path: &str) -> String {
  let normalized = normalize_path(path);

  #[cfg(target_os = "windows")]
  {
    return normalized.to_lowercase();
  }

  #[cfg(not(target_os = "windows"))]
  normalized
}

pub fn is_absolute_path(path: &str) -> bool {
  Path::new(path).is_absolute()
}

pub fn command_exists(command: &str) -> bool {
  resolve_command_path(command).is_some()
}

pub fn resolve_command_path(command: &str) -> Option<String> {
  if command.trim().is_empty() {
    return None;
  }

  if command.contains('/') || command.contains('\\') {
    return Path::new(command).exists().then(|| command.to_string());
  }

  if let Some(path) = resolve_command_path_from_env(command) {
    return Some(path);
  }

  #[cfg(target_os = "macos")]
  {
    if let Some(path) = resolve_command_path_from_shell(command) {
      return Some(path);
    }
  };

  #[cfg(target_os = "windows")]
  {
    if let Some(path) = resolve_command_path_from_where(command) {
      return Some(path);
    }
  }

  None
}

fn resolve_command_path_from_env(command: &str) -> Option<String> {
  let Some(paths) = env::var_os("PATH") else {
    return None;
  };

  #[cfg(target_os = "windows")]
  let extensions = ["exe", "cmd", "bat", "ps1"];

  env::split_paths(&paths).find_map(|directory| {
    let candidate = directory.join(command);
    if candidate.exists() {
      return Some(candidate.to_string_lossy().into_owned());
    }

    #[cfg(target_os = "windows")]
    {
      return extensions
        .iter()
        .map(|extension| candidate.with_extension(extension))
        .find(|path| path.exists())
        .map(|path| path.to_string_lossy().into_owned());
    }

    #[cfg(not(target_os = "windows"))]
    None
  })
}

#[cfg(target_os = "macos")]
fn resolve_command_path_from_shell(command: &str) -> Option<String> {
  let mut shells = Vec::new();
  if let Some(shell) = env::var_os("SHELL").and_then(|value| value.into_string().ok()) {
    shells.push(shell);
  }
  shells.push("/bin/zsh".into());
  shells.push("/bin/bash".into());

  shells
    .into_iter()
    .find_map(|shell| {
      Command::new(&shell)
        .arg("-lic")
        .arg(format!("command -v {}", shell_single_quote(command)))
        .output()
        .ok()
        .filter(|output| output.status.success())
        .and_then(|output| String::from_utf8(output.stdout).ok())
        .map(|output| output.trim().to_string())
        .filter(|output| !output.is_empty() && Path::new(output).exists())
    })
}

#[cfg(target_os = "windows")]
fn resolve_command_path_from_where(command: &str) -> Option<String> {
  Command::new("where")
    .arg(command)
    .output()
    .ok()
    .filter(|output| output.status.success())
    .and_then(|output| String::from_utf8(output.stdout).ok())
    .and_then(|output| output.lines().map(str::trim).find(|line| !line.is_empty()))
    .map(|line| line.to_string())
}

pub fn shell_single_quote(value: &str) -> String {
  format!("'{}'", value.replace('\'', "'\\''"))
}

pub fn applescript_escape(value: &str) -> String {
  value.replace('\\', "\\\\").replace('"', "\\\"")
}

#[cfg(target_os = "windows")]
fn is_windows_drive_root(path: &str) -> bool {
  let bytes = path.as_bytes();
  bytes.len() == 3 && bytes[1] == b':' && bytes[2] == b'\\'
}
