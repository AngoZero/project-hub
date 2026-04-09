use serde::{Deserialize, Serialize};

fn default_language_preference() -> String {
  "system".into()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickCommand {
  pub id: String,
  pub name: String,
  pub command: String,
  pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectUrl {
  pub id: String,
  pub label: String,
  pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectNotes {
  pub next_step: String,
  pub reminders: String,
  pub claude_prompt: String,
  pub codex_prompt: String,
  pub pending: String,
}

impl Default for ProjectNotes {
  fn default() -> Self {
    Self {
      next_step: String::new(),
      reminders: String::new(),
      claude_prompt: String::new(),
      codex_prompt: String::new(),
      pending: String::new(),
    }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectGitInfo {
  pub is_repo: bool,
  pub branch: Option<String>,
  pub dirty: Option<bool>,
}

impl Default for ProjectGitInfo {
  fn default() -> Self {
    Self {
      is_repo: false,
      branch: None,
      dirty: None,
    }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectRecord {
  pub id: String,
  pub source: String,
  pub name: String,
  pub path: String,
  pub description: String,
  pub tags: Vec<String>,
  pub client: String,
  pub project_type: String,
  pub stack: Vec<String>,
  pub detected_stack: Vec<String>,
  pub favorite: bool,
  pub last_accessed_at: Option<String>,
  pub created_at: String,
  pub updated_at: String,
  pub status: String,
  pub quick_commands: Vec<QuickCommand>,
  pub local_urls: Vec<ProjectUrl>,
  pub notes: ProjectNotes,
  pub detected_files: Vec<String>,
  pub git: ProjectGitInfo,
  pub path_exists: bool,
  #[serde(default)]
  pub workspace_id: String,
  #[serde(default)]
  pub sub_projects: Vec<SubProject>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubProject {
  pub name: String,
  pub path: String,
  pub stack: Vec<String>,
  pub project_type: String,
  pub detected_files: Vec<String>,
  pub git: ProjectGitInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
  pub id: String,
  pub name: String,
  pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RootFolder {
  pub id: String,
  pub path: String,
  pub label: String,
  pub max_depth: u8,
  pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Preferences {
  pub theme: String,
  pub catalog_layout: String,
  pub sort_by: String,
  pub root_scan_depth: u8,
  pub show_archived: bool,
  #[serde(default = "default_language_preference")]
  pub language: String,
}

impl Default for Preferences {
  fn default() -> Self {
    Self {
      theme: "dark".into(),
      catalog_layout: "grid".into(),
      sort_by: "lastAccessed".into(),
      root_scan_depth: 3,
      show_archived: true,
      language: default_language_preference(),
    }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppStore {
  pub version: u8,
  pub roots: Vec<RootFolder>,
  pub projects: Vec<ProjectRecord>,
  #[serde(default)]
  pub workspaces: Vec<Workspace>,
  pub preferences: Preferences,
}

impl Default for AppStore {
  fn default() -> Self {
    Self {
      version: 2,
      roots: Vec::new(),
      projects: Vec::new(),
      workspaces: Vec::new(),
      preferences: Preferences::default(),
    }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectActionPayload {
  pub kind: String,
  pub target_id: Option<String>,
  #[serde(default)]
  pub language: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionResult {
  pub ok: bool,
  pub message: String,
}
