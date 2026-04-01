/**
 * Versioned Memory Client — Typed wrapper for Gitea REST API.
 *
 * Wraps the Gitea REST API endpoints used by Q-GST for content store operations:
 * repos, files, PRs, issues, wiki, and org projects (kanban).
 */

import { authHeaders, fetchJSON } from './utils'

// =============================================================================
// Configuration
// =============================================================================

export interface VersionedMemoryConfig {
  /** Gitea endpoint, e.g. "http://localhost:3333" */
  endpoint: string
  /** Gitea API token */
  token: string
  /** Default owner/org, e.g. "qgst-acme" */
  owner: string
}

// =============================================================================
// Gitea API Types (subset we need)
// =============================================================================

export interface GiteaRepo {
  id: number
  name: string
  full_name: string
  description: string
  html_url: string
  clone_url: string
  default_branch: string
  empty: boolean
  size: number
  stars_count: number
  forks_count: number
  open_issues_count: number
  open_pr_counter: number
  created_at: string
  updated_at: string
}

export interface GiteaContent {
  name: string
  path: string
  sha: string
  /** "file" | "dir" | "symlink" | "submodule" */
  type: string
  size: number
  url: string
  html_url: string
  download_url: string | null
}

export interface GiteaFileContent extends GiteaContent {
  content: string
  encoding: string
}

export interface GiteaUser {
  id: number
  login: string
  full_name: string
  avatar_url: string
}

export interface GiteaLabel {
  id: number
  name: string
  color: string
}

export interface GiteaPR {
  id: number
  number: number
  title: string
  body: string
  state: string
  html_url: string
  user: GiteaUser
  head: { ref: string; sha: string }
  base: { ref: string; sha: string }
  labels: GiteaLabel[]
  mergeable: boolean
  merged: boolean
  created_at: string
  updated_at: string
}

export interface GiteaIssue {
  id: number
  number: number
  title: string
  body: string
  state: string
  html_url: string
  user: GiteaUser
  labels: GiteaLabel[]
  created_at: string
  updated_at: string
}

export interface GiteaWikiPage {
  title: string
  sub_url: string
  content: string
  html_url: string
  last_commit: {
    sha: string
    message: string
  } | null
}

export interface GiteaProject {
  id: number
  title: string
  description: string
  board_type: number
  created_at: string
  updated_at: string
}

// =============================================================================
// Client
// =============================================================================

export class VersionedMemoryClient {
  private endpoint: string
  private token: string
  private owner: string

  constructor(config: VersionedMemoryConfig) {
    this.endpoint = config.endpoint.replace(/\/$/, '')
    this.token = config.token
    this.owner = config.owner
  }

  // ---------------------------------------------------------------------------
  // Repos
  // ---------------------------------------------------------------------------

  async listRepos(owner?: string): Promise<GiteaRepo[]> {
    const org = owner ?? this.owner
    return this.get<GiteaRepo[]>(`/api/v1/orgs/${org}/repos`)
  }

  async getRepo(repo: string, owner?: string): Promise<GiteaRepo> {
    const org = owner ?? this.owner
    return this.get<GiteaRepo>(`/api/v1/repos/${org}/${repo}`)
  }

  // ---------------------------------------------------------------------------
  // Files
  // ---------------------------------------------------------------------------

  async listFiles(
    repo: string,
    path: string = '',
    ref?: string,
  ): Promise<GiteaContent[]> {
    const query = ref ? `?ref=${encodeURIComponent(ref)}` : ''
    return this.get<GiteaContent[]>(
      `/api/v1/repos/${this.owner}/${repo}/contents/${path}${query}`,
    )
  }

  async readFile(
    repo: string,
    filepath: string,
    ref?: string,
  ): Promise<GiteaFileContent> {
    const query = ref ? `?ref=${encodeURIComponent(ref)}` : ''
    return this.get<GiteaFileContent>(
      `/api/v1/repos/${this.owner}/${repo}/contents/${filepath}${query}`,
    )
  }

  async writeFile(
    repo: string,
    filepath: string,
    content: string,
    message: string,
    branch?: string,
    sha?: string,
  ): Promise<GiteaFileContent> {
    const body: Record<string, unknown> = {
      content: btoa(content),
      message,
    }
    if (branch) body.branch = branch
    if (sha) body.sha = sha

    return this.request<GiteaFileContent>(
      'PUT',
      `/api/v1/repos/${this.owner}/${repo}/contents/${filepath}`,
      body,
    )
  }

  // ---------------------------------------------------------------------------
  // Pull Requests
  // ---------------------------------------------------------------------------

  async listPRs(
    repo: string,
    state: 'open' | 'closed' | 'all' = 'open',
  ): Promise<GiteaPR[]> {
    return this.get<GiteaPR[]>(
      `/api/v1/repos/${this.owner}/${repo}/pulls?state=${state}`,
    )
  }

  async createPR(
    repo: string,
    head: string,
    base: string,
    title: string,
    body?: string,
  ): Promise<GiteaPR> {
    return this.request<GiteaPR>(
      'POST',
      `/api/v1/repos/${this.owner}/${repo}/pulls`,
      { head, base, title, body: body ?? '' },
    )
  }

  async getPR(repo: string, index: number): Promise<GiteaPR> {
    return this.get<GiteaPR>(
      `/api/v1/repos/${this.owner}/${repo}/pulls/${index}`,
    )
  }

  // ---------------------------------------------------------------------------
  // Issues
  // ---------------------------------------------------------------------------

  async listIssues(
    repo: string,
    state: 'open' | 'closed' | 'all' = 'open',
  ): Promise<GiteaIssue[]> {
    return this.get<GiteaIssue[]>(
      `/api/v1/repos/${this.owner}/${repo}/issues?state=${state}&type=issues`,
    )
  }

  // ---------------------------------------------------------------------------
  // Wiki
  // ---------------------------------------------------------------------------

  async listWikiPages(repo: string): Promise<GiteaWikiPage[]> {
    return this.get<GiteaWikiPage[]>(
      `/api/v1/repos/${this.owner}/${repo}/wiki/pages`,
    )
  }

  async getWikiPage(repo: string, pageName: string): Promise<GiteaWikiPage> {
    return this.get<GiteaWikiPage>(
      `/api/v1/repos/${this.owner}/${repo}/wiki/page/${encodeURIComponent(pageName)}`,
    )
  }

  // ---------------------------------------------------------------------------
  // Org Projects (Kanban)
  // ---------------------------------------------------------------------------

  async listProjects(org?: string): Promise<GiteaProject[]> {
    const o = org ?? this.owner
    return this.get<GiteaProject[]>(`/api/v1/orgs/${o}/projects`)
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private async get<T>(path: string): Promise<T> {
    return fetchJSON<T>(`${this.endpoint}${path}`, {
      headers: authHeaders(this.token),
    })
  }

  private async request<T>(
    method: string,
    path: string,
    body: unknown,
  ): Promise<T> {
    return fetchJSON<T>(`${this.endpoint}${path}`, {
      method,
      headers: authHeaders(this.token),
      body: JSON.stringify(body),
    })
  }
}
