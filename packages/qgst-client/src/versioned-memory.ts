/**
 * Q-GST Versioned Memory Client
 *
 * Typed wrapper for Q-GST Versioned Memory (content store) operations:
 * brain repos, memory files, knowledge reviews (PRs), tasks (issues),
 * agent skills (wiki), project boards, and agent provisioning.
 */

import { authHeaders, fetchJSON } from './utils'

// =============================================================================
// Q-GST Memory Architecture Constants
// =============================================================================

/** Brain repo types — 5 per agent */
export const BRAIN_REPO_TYPES = [
  'episodic',
  'knowledge',
  'analysis',
  'context',
  'inbox',
] as const
export type BrainRepoType = (typeof BRAIN_REPO_TYPES)[number]

/** Shared repos — 4 per tenant */
export const SHARED_REPOS = [
  'shared-knowledge',
  'shared-templates',
  'shared-ontology',
  'admin-config',
] as const
export type SharedRepoName = (typeof SHARED_REPOS)[number]

/** Resolve brain repo name for an agent */
export function brainRepoName(
  agentName: string,
  type: BrainRepoType,
): string {
  return `${agentName}-${type}`
}

/** Resolve tenant org name */
export function tenantOrgName(tenant: string): string {
  return `qgst-${tenant}`
}

// =============================================================================
// Configuration
// =============================================================================

export interface VersionedMemoryConfig {
  /** Q-GST Versioned Memory endpoint */
  endpoint: string
  /** API token */
  token: string
  /** Default tenant org, e.g. "qgst-acme" */
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

export interface GiteaOrg {
  id: number
  username: string
  full_name: string
  description: string
  avatar_url: string
  visibility: string
}

export interface ProvisionResult {
  agent: string
  tenant: string
  org: string
  userCreated: boolean
  orgCreated: boolean
  brainRepos: string[]
  sharedRepos: string[]
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
  // Project Boards (Kanban)
  // ---------------------------------------------------------------------------

  async listProjects(org?: string): Promise<GiteaProject[]> {
    const o = org ?? this.owner
    return this.get<GiteaProject[]>(`/api/v1/orgs/${o}/projects`)
  }

  // ---------------------------------------------------------------------------
  // Agent Provisioning — Admin operations for Q-GST Engine
  // ---------------------------------------------------------------------------

  /** List all agents (users) in the system */
  async listUsers(): Promise<GiteaUser[]> {
    return this.get<GiteaUser[]>('/api/v1/admin/users?limit=50')
  }

  /** Create an agent identity in versioned memory */
  async createUser(
    username: string,
    email: string,
    password: string,
  ): Promise<GiteaUser> {
    return this.request<GiteaUser>('POST', '/api/v1/admin/users', {
      username,
      email,
      password,
      must_change_password: false,
    })
  }

  /** Create a tenant org */
  async createOrg(
    orgName: string,
    description?: string,
  ): Promise<GiteaOrg> {
    return this.request<GiteaOrg>('POST', '/api/v1/orgs', {
      username: orgName,
      full_name: orgName,
      description: description ?? `Q-GST tenant: ${orgName}`,
      visibility: 'private',
    })
  }

  /** Get tenant org details */
  async getOrg(orgName?: string): Promise<GiteaOrg> {
    const o = orgName ?? this.owner
    return this.get<GiteaOrg>(`/api/v1/orgs/${o}`)
  }

  /** List org members (agents in this tenant) */
  async listOrgMembers(orgName?: string): Promise<GiteaUser[]> {
    const o = orgName ?? this.owner
    return this.get<GiteaUser[]>(`/api/v1/orgs/${o}/members`)
  }

  /** Add agent to tenant org */
  async addOrgMember(username: string, orgName?: string): Promise<void> {
    const o = orgName ?? this.owner
    await this.request<unknown>(
      'PUT',
      `/api/v1/orgs/${o}/members/${username}`,
      {},
    )
  }

  /** Create a repo in the tenant org (brain repo, project repo, etc.) */
  async createRepo(
    repoName: string,
    description?: string,
    isPrivate = true,
    orgName?: string,
  ): Promise<GiteaRepo> {
    const o = orgName ?? this.owner
    return this.request<GiteaRepo>('POST', `/api/v1/orgs/${o}/repos`, {
      name: repoName,
      description: description ?? '',
      private: isPrivate,
      auto_init: true,
    })
  }

  /**
   * Provision a full agent: create user, add to org, create 5 brain repos.
   * Returns summary of what was created.
   */
  async provisionAgent(
    tenant: string,
    agentName: string,
    email: string,
    password: string,
  ): Promise<ProvisionResult> {
    const orgName = tenantOrgName(tenant)
    const result: ProvisionResult = {
      agent: agentName,
      tenant,
      org: orgName,
      userCreated: false,
      orgCreated: false,
      brainRepos: [],
      sharedRepos: [],
    }

    // Ensure tenant org exists
    try {
      await this.getOrg(orgName)
    } catch {
      await this.createOrg(orgName, `Q-GST Engine tenant: ${tenant}`)
      result.orgCreated = true
      // Create shared repos
      for (const shared of SHARED_REPOS) {
        try {
          await this.createRepo(shared, `Q-GST ${shared}`, true, orgName)
          result.sharedRepos.push(shared)
        } catch {
          // May already exist
        }
      }
    }

    // Create agent user
    try {
      await this.createUser(agentName, email, password)
      result.userCreated = true
    } catch {
      // May already exist
    }

    // Add to org
    await this.addOrgMember(agentName, orgName)

    // Create brain repos
    for (const type of BRAIN_REPO_TYPES) {
      const repoName = brainRepoName(agentName, type)
      try {
        await this.createRepo(
          repoName,
          `${agentName} — ${type} memory`,
          true,
          orgName,
        )
        result.brainRepos.push(repoName)
      } catch {
        // May already exist
      }
    }

    return result
  }

  /**
   * List an agent's brain repos (the 5 memory stores).
   */
  async listBrainRepos(agentName: string): Promise<GiteaRepo[]> {
    const allRepos = await this.listRepos()
    return allRepos.filter((r) =>
      BRAIN_REPO_TYPES.some((type) => r.name === brainRepoName(agentName, type)),
    )
  }

  /**
   * List agent skills from the knowledge repo wiki.
   */
  async listAgentSkills(agentName: string): Promise<GiteaWikiPage[]> {
    const knowledgeRepo = brainRepoName(agentName, 'knowledge')
    try {
      return await this.listWikiPages(knowledgeRepo)
    } catch {
      return []
    }
  }

  /**
   * Get a specific agent skill page.
   */
  async getAgentSkill(
    agentName: string,
    skillName: string,
  ): Promise<GiteaWikiPage> {
    const knowledgeRepo = brainRepoName(agentName, 'knowledge')
    return this.getWikiPage(knowledgeRepo, skillName)
  }

  /**
   * List knowledge reviews (open PRs) for an agent's repos.
   */
  async listKnowledgeReviews(
    agentName: string,
    state: 'open' | 'closed' | 'all' = 'open',
  ): Promise<GiteaPR[]> {
    const knowledgeRepo = brainRepoName(agentName, 'knowledge')
    try {
      return await this.listPRs(knowledgeRepo, state)
    } catch {
      return []
    }
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
