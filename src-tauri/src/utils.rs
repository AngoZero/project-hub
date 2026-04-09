use chrono::Utc;
use std::{
  env,
  path::Path,
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
  if command.trim().is_empty() {
    return false;
  }

  if command.contains('/') || command.contains('\\') {
    return Path::new(command).exists();
  }

  let Some(paths) = env::var_os("PATH") else {
    return false;
  };

  #[cfg(target_os = "windows")]
  let extensions = ["exe", "cmd", "bat", "ps1"];

  env::split_paths(&paths).any(|directory| {
    let candidate = directory.join(command);
    if candidate.exists() {
      return true;
    }

    #[cfg(target_os = "windows")]
    {
      return extensions
        .iter()
        .map(|extension| candidate.with_extension(extension))
        .any(|path| path.exists());
    }

    #[cfg(not(target_os = "windows"))]
    false
  })
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
