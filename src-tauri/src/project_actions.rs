use crate::types::{ActionResult, AppStore, ProjectActionPayload, ProjectRecord};
use crate::utils::{applescript_escape, command_exists, shell_single_quote};
use std::{
  process::{Command, Stdio},
};

pub fn run_project_action(store: &mut AppStore, project_id: &str, action: ProjectActionPayload) -> Result<ActionResult, String> {
  let language = action.language.as_str();
  let Some(project) = store.projects.iter_mut().find(|project| project.id == project_id) else {
    return Err(message(language, "Project not found.", "Proyecto no encontrado."));
  };

  let result = match action.kind.as_str() {
    "openFinder" => open_finder(project, language),
    "openCode" => open_code(project, language),
    "openTerminal" => open_terminal(project, language),
    "openClaude" => open_tool(project, "claude", "Claude", language),
    "openCodex" => open_tool(project, "codex", "Codex", language),
    "openLocalUrl" => open_local_url(project, action.target_id.as_deref(), language),
    "runQuickCommand" => run_quick_command(project, action.target_id.as_deref(), language),
    _ => Err(message(language, "Unsupported action.", "Acción no soportada.")),
  }?;

  project.last_accessed_at = Some(crate::utils::now_iso());
  Ok(ActionResult { ok: true, message: result })
}

fn message(language: &str, en: &str, es: &str) -> String {
  if language.starts_with("es") {
    es.into()
  } else {
    en.into()
  }
}

fn open_finder(project: &ProjectRecord, language: &str) -> Result<String, String> {
  #[cfg(target_os = "macos")]
  {
    spawn(Command::new("open").arg(&project.path))?;
    return Ok(message(language, "Opened in Finder.", "Abierto en Finder."));
  }

  #[cfg(target_os = "windows")]
  {
    spawn(Command::new("explorer").arg(&project.path))?;
    return Ok(message(language, "Opened in Explorer.", "Abierto en Explorer."));
  }

  #[cfg(not(any(target_os = "macos", target_os = "windows")))]
  Err(message(
    language,
    "Finder action is not supported on this platform yet.",
    "La acción de Finder todavía no está soportada en esta plataforma.",
  ))
}

fn open_code(project: &ProjectRecord, language: &str) -> Result<String, String> {
  if command_exists("code") {
    spawn(Command::new("code").arg(&project.path))?;
    return Ok(message(language, "Opened in VS Code.", "Abierto en VS Code."));
  }

  #[cfg(target_os = "macos")]
  {
    spawn(Command::new("open").arg("-a").arg("Visual Studio Code").arg(&project.path))?;
    return Ok(message(language, "Opened in VS Code.", "Abierto en VS Code."));
  }

  #[cfg(not(target_os = "macos"))]
  Err(message(
    language,
    "VS Code was not found in PATH or the default macOS application registry.",
    "VS Code no se encontró en PATH ni en el registro por defecto de aplicaciones de macOS.",
  ))
}

fn open_terminal(project: &ProjectRecord, language: &str) -> Result<String, String> {
  #[cfg(target_os = "macos")]
  {
    return open_terminal_macos(&project.path, None, language);
  }

  #[cfg(target_os = "windows")]
  {
    return open_terminal_windows(&project.path, None, language);
  }

  #[cfg(not(any(target_os = "macos", target_os = "windows")))]
  Err(message(
    language,
    "Terminal integration is not supported on this platform yet.",
    "La integración con terminal todavía no está soportada en esta plataforma.",
  ))
}

fn open_tool(project: &ProjectRecord, command: &str, label: &str, language: &str) -> Result<String, String> {
  if !command_exists(command) {
    return Err(if language.starts_with("es") {
      format!("{label} no está disponible en PATH.")
    } else {
      format!("{label} is not available in PATH.")
    });
  }

  #[cfg(target_os = "macos")]
  {
    return open_terminal_macos(&project.path, Some(command), language);
  }

  #[cfg(target_os = "windows")]
  {
    return open_terminal_windows(&project.path, Some(command), language);
  }

  #[cfg(not(any(target_os = "macos", target_os = "windows")))]
  Err(if language.starts_with("es") {
    format!("La integración con {label} todavía no está soportada en esta plataforma.")
  } else {
    format!("{label} integration is not supported on this platform yet.")
  })
}

fn open_local_url(project: &ProjectRecord, target_id: Option<&str>, language: &str) -> Result<String, String> {
  let Some(target_id) = target_id else {
    return Err(message(language, "URL id is required.", "Se requiere el id de la URL."));
  };

  let Some(url) = project.local_urls.iter().find(|item| item.id == target_id) else {
    return Err(message(language, "Local URL not found.", "No se encontró la URL local."));
  };

  #[cfg(target_os = "macos")]
  {
    spawn(Command::new("open").arg(&url.url))?;
    return Ok(if language.starts_with("es") {
      format!("Se abrió {}.", url.label)
    } else {
      format!("Opened {}.", url.label)
    });
  }

  #[cfg(target_os = "windows")]
  {
    spawn(Command::new("cmd").arg("/C").arg("start").arg("").arg(&url.url))?;
    return Ok(if language.starts_with("es") {
      format!("Se abrió {}.", url.label)
    } else {
      format!("Opened {}.", url.label)
    });
  }

  #[cfg(not(any(target_os = "macos", target_os = "windows")))]
  Err(message(
    language,
    "URL opening is not supported on this platform yet.",
    "Abrir URLs todavía no está soportado en esta plataforma.",
  ))
}

fn run_quick_command(project: &ProjectRecord, target_id: Option<&str>, language: &str) -> Result<String, String> {
  let Some(target_id) = target_id else {
    return Err(message(language, "Quick command id is required.", "Se requiere el id del comando rápido."));
  };

  let Some(command) = project.quick_commands.iter().find(|item| item.id == target_id) else {
    return Err(message(language, "Quick command not found.", "No se encontró el comando rápido."));
  };

  #[cfg(target_os = "macos")]
  {
    return open_terminal_macos(&project.path, Some(&command.command), language);
  }

  #[cfg(target_os = "windows")]
  {
    return open_terminal_windows(&project.path, Some(&command.command), language);
  }

  #[cfg(not(any(target_os = "macos", target_os = "windows")))]
  Err(message(
    language,
    "Quick commands are not supported on this platform yet.",
    "Los comandos rápidos todavía no están soportados en esta plataforma.",
  ))
}

#[cfg(target_os = "macos")]
fn open_terminal_macos(path: &str, command: Option<&str>, language: &str) -> Result<String, String> {
  let warp_exists = std::path::Path::new("/Applications/Warp.app").exists();
  let iterm_exists = std::path::Path::new("/Applications/iTerm.app").exists();

  if command.is_none() && warp_exists {
    if command_exists("warp") {
      spawn(Command::new("warp").current_dir(path).arg("."))?;
    } else {
      spawn(Command::new("open").arg("-a").arg("Warp").arg(path))?;
    }
    return Ok(message(language, "Opened terminal in Warp.", "Terminal abierto en Warp."));
  }

  if iterm_exists {
    open_iterm(path, command)?;
    return Ok(if command.is_some() {
      message(language, "Opened command in iTerm.", "Comando abierto en iTerm.")
    } else {
      message(language, "Opened terminal in iTerm.", "Terminal abierto en iTerm.")
    });
  }

  open_terminal_app(path, command)?;
  Ok(if command.is_some() {
    message(language, "Opened command in Terminal.app.", "Comando abierto en Terminal.app.")
  } else {
    message(language, "Opened terminal in Terminal.app.", "Terminal abierto en Terminal.app.")
  })
}

#[cfg(target_os = "windows")]
fn open_terminal_windows(path: &str, command: Option<&str>, language: &str) -> Result<String, String> {
  if command_exists("wt") {
    let mut process = Command::new("wt");
    process.arg("-d").arg(path);
    if let Some(command) = command {
      process.arg("powershell").arg("-NoExit").arg("-Command").arg(command);
    }
    spawn(&mut process)?;
    return Ok(message(language, "Opened in Windows Terminal.", "Abierto en Windows Terminal."));
  }

  let inline = command
    .map(|value| format!("Set-Location -LiteralPath '{}'; {}", path.replace('\'', "''"), value))
    .unwrap_or_else(|| format!("Set-Location -LiteralPath '{}'", path.replace('\'', "''")));

  spawn(
    Command::new("powershell")
      .arg("-NoExit")
      .arg("-Command")
      .arg(inline),
  )?;

  Ok(message(language, "Opened in PowerShell.", "Abierto en PowerShell."))
}

#[cfg(target_os = "macos")]
fn open_terminal_app(path: &str, command: Option<&str>) -> Result<(), String> {
  let inline = inline_shell(path, command);
  let script = format!(
    "tell application \"Terminal\"\nactivate\ndo script \"{}\"\nend tell",
    applescript_escape(&inline)
  );

  run_osascript(&script)
}

#[cfg(target_os = "macos")]
fn open_iterm(path: &str, command: Option<&str>) -> Result<(), String> {
  let inline = inline_shell(path, command);
  let script = format!(
    "tell application \"iTerm\"\nactivate\nif (count of windows) = 0 then\ncreate window with default profile\nelse\ntell current window\ncreate tab with default profile\nend tell\nend if\ntell current session of current window\nwrite text \"{}\"\nend tell\nend tell",
    applescript_escape(&inline)
  );

  run_osascript(&script)
}

#[cfg(target_os = "macos")]
fn run_osascript(script: &str) -> Result<(), String> {
  Command::new("osascript")
    .arg("-e")
    .arg(script)
    .status()
    .map_err(|error| error.to_string())
    .and_then(|status| {
      if status.success() {
        Ok(())
      } else {
        Err("AppleScript execution failed.".into())
      }
    })
}

#[cfg(target_os = "macos")]
fn inline_shell(path: &str, command: Option<&str>) -> String {
  let mut inline = format!("cd {}", shell_single_quote(path));
  if let Some(command) = command {
    inline.push_str("; ");
    inline.push_str(command);
  }
  inline
}

fn spawn(command: &mut Command) -> Result<(), String> {
  command.stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null());
  command.spawn().map(|_| ()).map_err(|error| error.to_string())
}
