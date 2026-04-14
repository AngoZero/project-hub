use crate::{
  integrations,
  types::{ActionResult, AppStore, ProjectActionPayload, ProjectRecord, ToolIntegration},
};
use crate::utils::{applescript_escape, command_exists, comparable_path, shell_single_quote};
use std::{
  process::{Command, Stdio},
};

pub fn run_project_action(store: &mut AppStore, project_id: &str, action: ProjectActionPayload) -> Result<ActionResult, String> {
  let language = action.language.as_str();
  let Some(project_index) = store.projects.iter().position(|project| project.id == project_id) else {
    return Err(message(language, "Project not found.", "Proyecto no encontrado."));
  };
  let project = &store.projects[project_index];
  let target_path = resolve_action_path(project, action.path_override.as_deref(), language)?;

  let result = match action.kind.as_str() {
    "openFinder" => open_finder(&target_path, language),
    "openCode" => open_integration(store, &target_path, Some("vscode"), language),
    "openTerminal" => open_terminal(&target_path, language),
    "openClaude" => open_integration(store, &target_path, Some("claude"), language),
    "openCodex" => open_integration(store, &target_path, Some("codex"), language),
    "openIntegration" => open_integration(store, &target_path, action.target_id.as_deref(), language),
    "openLocalUrl" => open_local_url(project, action.target_id.as_deref(), language),
    "runQuickCommand" => run_quick_command(project, action.target_id.as_deref(), &target_path, language),
    _ => Err(message(language, "Unsupported action.", "Acción no soportada.")),
  }?;

  if let Some(project) = store.projects.get_mut(project_index) {
    project.last_accessed_at = Some(crate::utils::now_iso());
  }
  Ok(ActionResult { ok: true, message: result })
}

fn resolve_action_path(project: &ProjectRecord, path_override: Option<&str>, language: &str) -> Result<String, String> {
  let Some(path_override) = path_override else {
    return Ok(project.path.clone());
  };

  let comparable_override = comparable_path(path_override);
  if comparable_override == comparable_path(&project.path)
    || project
      .sub_projects
      .iter()
      .any(|sub_project| comparable_path(&sub_project.path) == comparable_override)
  {
    return Ok(path_override.into());
  }

  Err(message(
    language,
    "Path override is not part of this project.",
    "La ruta alterna no pertenece a este proyecto.",
  ))
}

fn message(language: &str, en: &str, es: &str) -> String {
  if language.starts_with("es") {
    es.into()
  } else {
    en.into()
  }
}

pub fn authorize_destructive_action(language: &str) -> Result<ActionResult, String> {
  #[cfg(target_os = "macos")]
  {
    let prompt = message(
      language,
      "Project Hub needs permission to delete this project entry.",
      "Project Hub necesita permiso para eliminar esta entrada de proyecto.",
    );
    let script = format!(
      "do shell script \"true\" with administrator privileges with prompt \"{}\"",
      applescript_escape(&prompt)
    );
    run_osascript(&script)?;
    return Ok(ActionResult {
      ok: true,
      message: message(language, "Delete authorized.", "Eliminación autorizada."),
    });
  }

  #[cfg(target_os = "windows")]
  {
    let status = Command::new("powershell")
      .arg("-NoProfile")
      .arg("-Command")
      .arg("Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile','-Command','exit 0'")
      .status()
      .map_err(|error| error.to_string())?;

    if status.success() {
      return Ok(ActionResult {
        ok: true,
        message: message(language, "Delete authorized.", "Eliminación autorizada."),
      });
    }

    return Err(message(
      language,
      "System authorization was cancelled.",
      "La autorización del sistema fue cancelada.",
    ));
  }

  #[cfg(not(any(target_os = "macos", target_os = "windows")))]
  Ok(ActionResult {
    ok: true,
    message: message(language, "Delete confirmation accepted.", "Confirmación aceptada."),
  })
}

fn open_finder(path: &str, language: &str) -> Result<String, String> {
  #[cfg(target_os = "macos")]
  {
    spawn(Command::new("open").arg(path))?;
    return Ok(message(language, "Opened in Finder.", "Abierto en Finder."));
  }

  #[cfg(target_os = "windows")]
  {
    spawn(Command::new("explorer").arg(path))?;
    return Ok(message(language, "Opened in Explorer.", "Abierto en Explorer."));
  }

  #[cfg(not(any(target_os = "macos", target_os = "windows")))]
  Err(message(
    language,
    "Finder action is not supported on this platform yet.",
    "La acción de Finder todavía no está soportada en esta plataforma.",
  ))
}

fn open_terminal(path: &str, language: &str) -> Result<String, String> {
  #[cfg(target_os = "macos")]
  {
    return open_terminal_macos(path, None, language);
  }

  #[cfg(target_os = "windows")]
  {
    return open_terminal_windows(path, None, language);
  }

  #[cfg(not(any(target_os = "macos", target_os = "windows")))]
  Err(message(
    language,
    "Terminal integration is not supported on this platform yet.",
    "La integración con terminal todavía no está soportada en esta plataforma.",
  ))
}

fn open_integration(store: &AppStore, path: &str, integration_id: Option<&str>, language: &str) -> Result<String, String> {
  let Some(integration_id) = integration_id else {
    return Err(message(language, "Tool id is required.", "Se requiere el id de la herramienta."));
  };

  if integration_id == "terminal" {
    return open_terminal(path, language);
  }

  if integration_id == "fileManager" {
    return open_finder(path, language);
  }

  let Some(integration) = integrations::find_installed_integration(&store.tool_overrides, integration_id) else {
    return Err(if language.starts_with("es") {
      format!("{} no está disponible en este equipo.", integration_id)
    } else {
      format!("{integration_id} is not available on this machine.")
    });
  };

  match integration.category.as_str() {
    "editor" => open_editor(path, &integration, language),
    "agent" => {
      let command = integration.command.as_deref().or(integration.executable_path.as_deref());
      let Some(command) = command else {
        return Err(if language.starts_with("es") {
          format!("{} no tiene una ruta ejecutable disponible.", integration.label)
        } else {
          format!("{} does not expose an executable launch target.", integration.label)
        });
      };
      open_tool(path, command, &integration.label, language)
    }
    _ => Err(message(language, "Unsupported tool category.", "Categoría de herramienta no soportada.")),
  }
}

fn open_editor(project_path: &str, integration: &ToolIntegration, language: &str) -> Result<String, String> {
  if let Some(command) = integration.command.as_deref() {
    spawn(Command::new(command).arg(project_path))?;
    return Ok(if language.starts_with("es") {
      format!("Abierto en {}.", integration.label)
    } else {
      format!("Opened in {}.", integration.label)
    });
  }

  if let Some(path) = integration.executable_path.as_deref() {
    #[cfg(target_os = "macos")]
    {
      spawn(Command::new("open").arg("-a").arg(path).arg(project_path))?;
      return Ok(if language.starts_with("es") {
        format!("Abierto en {}.", integration.label)
      } else {
        format!("Opened in {}.", integration.label)
      });
    }

    #[cfg(target_os = "windows")]
    {
      spawn(Command::new(path).arg(project_path))?;
      return Ok(if language.starts_with("es") {
        format!("Abierto en {}.", integration.label)
      } else {
        format!("Opened in {}.", integration.label)
      });
    }
  }

  Err(if language.starts_with("es") {
    format!("{} no tiene una forma de apertura disponible.", integration.label)
  } else {
    format!("{} does not have an available launch method.", integration.label)
  })
}

fn open_tool(project_path: &str, command: &str, label: &str, language: &str) -> Result<String, String> {
  if !command_exists(command) {
    return Err(if language.starts_with("es") {
      format!("{label} no está disponible en PATH.")
    } else {
      format!("{label} is not available in PATH.")
    });
  }

  #[cfg(target_os = "macos")]
  {
    return open_terminal_macos(project_path, Some(command), language);
  }

  #[cfg(target_os = "windows")]
  {
    return open_terminal_windows(project_path, Some(command), language);
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

fn run_quick_command(project: &ProjectRecord, target_id: Option<&str>, target_path: &str, language: &str) -> Result<String, String> {
  let Some(target_id) = target_id else {
    return Err(message(language, "Quick command id is required.", "Se requiere el id del comando rápido."));
  };

  let commands = if comparable_path(target_path) == comparable_path(&project.path) {
    &project.quick_commands
  } else {
    project
      .sub_projects
      .iter()
      .find(|sub_project| comparable_path(&sub_project.path) == comparable_path(target_path))
      .map(|sub_project| &sub_project.quick_commands)
      .ok_or_else(|| message(language, "Quick command path is not part of this project.", "La ruta del comando no pertenece a este proyecto."))?
  };

  let Some(command) = commands.iter().find(|item| item.id == target_id) else {
    return Err(message(language, "Quick command not found.", "No se encontró el comando rápido."));
  };

  #[cfg(target_os = "macos")]
  {
    return open_terminal_macos(target_path, Some(&command.command), language);
  }

  #[cfg(target_os = "windows")]
  {
    return open_terminal_windows(target_path, Some(&command.command), language);
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
  let inline = command
    .map(|value| format!("Set-Location -LiteralPath '{}'; {}", path.replace('\'', "''"), value))
    .unwrap_or_else(|| format!("Set-Location -LiteralPath '{}'", path.replace('\'', "''")));

  if command_exists("wt") {
    let mut process = Command::new("wt");
    process.arg("-d").arg(path);
    process.arg("powershell").arg("-NoExit").arg("-Command").arg(&inline);
    spawn(&mut process)?;
    return Ok(message(language, "Opened in Windows Terminal.", "Abierto en Windows Terminal."));
  }

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
