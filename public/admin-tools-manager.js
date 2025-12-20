// Admin Tools Manager UI
// Frontend component for viewing and analyzing tools/platforms usage

class AdminToolsManager {
  constructor(apiBase, adminToken) {
    this.API_BASE = apiBase;
    this.adminToken = adminToken;
    this.toolsData = [];
    this.statsData = null;
    this.selectedTool = null;
  }
  
  /**
   * Load all tools data from API
   */
  async loadToolsData() {
    try {
      const response = await fetch(`${this.API_BASE}/tools`, {
        headers: {
          'Authorization': `Bearer ${this.adminToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load tools');
      }
      
      const data = await response.json();
      this.toolsData = data.tools;
      
      // Also load stats
      await this.loadToolsStats();
      
      return this.toolsData;
      
    } catch (error) {
      console.error('Error loading tools:', error);
      throw error;
    }
  }
  
  /**
   * Load tools statistics
   */
  async loadToolsStats() {
    try {
      const response = await fetch(`${this.API_BASE}/tools/stats`, {
        headers: {
          'Authorization': `Bearer ${this.adminToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load tools stats');
      }
      
      const data = await response.json();
      this.statsData = data.stats;
      
      return this.statsData;
      
    } catch (error) {
      console.error('Error loading tools stats:', error);
      throw error;
    }
  }
  
  /**
   * Get tool details
   */
  async getToolDetails(toolName) {
    try {
      const response = await fetch(`${this.API_BASE}/tools/detail/${encodeURIComponent(toolName)}`, {
        headers: {
          'Authorization': `Bearer ${this.adminToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load tool details');
      }
      
      const data = await response.json();
      return data.details;
      
    } catch (error) {
      console.error('Error loading tool details:', error);
      throw error;
    }
  }
  
  /**
   * Render the tools overview section in admin dashboard
   */
  renderToolsOverview(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Tools container not found');
      return;
    }
    
    container.innerHTML = `
      <div class="tools-dashboard">
        <!-- Stats Cards -->
        <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
          <div class="stat-card" style="background: var(--card-bg); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Total Unique Tools</div>
            <div id="stat-total-tools" style="font-size: 2rem; font-weight: 600; color: var(--text-primary);">-</div>
          </div>
          
          <div class="stat-card" style="background: var(--card-bg); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Total Mentions</div>
            <div id="stat-total-mentions" style="font-size: 2rem; font-weight: 600; color: var(--text-primary);">-</div>
          </div>
          
          <div class="stat-card" style="background: var(--card-bg); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Categories</div>
            <div id="stat-categories" style="font-size: 2rem; font-weight: 600; color: var(--text-primary);">-</div>
          </div>
        </div>
        
        <!-- Tabs -->
        <div class="tools-tabs" style="display: flex; gap: 1rem; border-bottom: 2px solid var(--border-color); margin-bottom: 2rem;">
          <button id="tab-all-tools" class="tools-tab active" style="padding: 0.75rem 1.5rem; background: none; border: none; border-bottom: 3px solid var(--primary-color); color: var(--primary-color); cursor: pointer; font-weight: 600;">
            All Tools
          </button>
          <button id="tab-by-category" class="tools-tab" style="padding: 0.75rem 1.5rem; background: none; border: none; border-bottom: 3px solid transparent; color: var(--text-secondary); cursor: pointer;">
            By Category
          </button>
          <button id="tab-most-used" class="tools-tab" style="padding: 0.75rem 1.5rem; background: none; border: none; border-bottom: 3px solid transparent; color: var(--text-secondary); cursor: pointer;">
            Most Used
          </button>
        </div>
        
        <!-- Content Area -->
        <div id="tools-content">
          <div class="loading-spinner" style="text-align: center; padding: 3rem;">
            Loading tools data...
          </div>
        </div>
        
        <!-- Tool Details Modal -->
        <div id="tool-details-modal" class="modal hidden" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;">
          <div class="modal-content" style="background: var(--card-bg); padding: 2rem; border-radius: 12px; max-width: 800px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
              <h2 id="tool-detail-name" style="margin: 0; font-size: 1.5rem;">Tool Details</h2>
              <button id="close-tool-modal" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-secondary);">×</button>
            </div>
            <div id="tool-detail-content"></div>
          </div>
        </div>
      </div>
    `;
    
    // Setup event listeners
    this.setupEventListeners();
  }
  
  /**
   * Setup event listeners for tabs and interactions
   */
  setupEventListeners() {
    // Tab switching
    document.getElementById('tab-all-tools')?.addEventListener('click', () => {
      this.switchTab('all-tools');
      this.renderAllTools();
    });
    
    document.getElementById('tab-by-category')?.addEventListener('click', () => {
      this.switchTab('by-category');
      this.renderByCategory();
    });
    
    document.getElementById('tab-most-used')?.addEventListener('click', () => {
      this.switchTab('most-used');
      this.renderMostUsed();
    });
    
    // Modal close
    document.getElementById('close-tool-modal')?.addEventListener('click', () => {
      this.hideToolDetails();
    });
    
    // Click outside modal to close
    document.getElementById('tool-details-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'tool-details-modal') {
        this.hideToolDetails();
      }
    });
  }
  
  /**
   * Switch active tab
   */
  switchTab(tabName) {
    document.querySelectorAll('.tools-tab').forEach(tab => {
      tab.classList.remove('active');
      tab.style.borderBottom = '3px solid transparent';
      tab.style.color = 'var(--text-secondary)';
    });
    
    const activeTab = document.getElementById(`tab-${tabName}`);
    if (activeTab) {
      activeTab.classList.add('active');
      activeTab.style.borderBottom = '3px solid var(--primary-color)';
      activeTab.style.color = 'var(--primary-color)';
    }
  }
  
  /**
   * Update stats display
   */
  updateStats() {
    if (!this.statsData) return;
    
    document.getElementById('stat-total-tools').textContent = this.statsData.total_unique_tools;
    document.getElementById('stat-total-mentions').textContent = this.statsData.total_mentions;
    document.getElementById('stat-categories').textContent = Object.keys(this.statsData.by_category).length;
  }
  
  /**
   * Render all tools list
   */
  renderAllTools() {
    const content = document.getElementById('tools-content');
    if (!content) return;
    
    if (this.toolsData.length === 0) {
      content.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
          No tools found yet. Tools will appear as users document their tasks.
        </div>
      `;
      return;
    }
    
    let html = `
      <div class="tools-table-container" style="overflow-x: auto;">
        <table class="tools-table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border-color);">
              <th style="text-align: left; padding: 1rem; font-weight: 600; color: var(--text-primary);">Tool Name</th>
              <th style="text-align: left; padding: 1rem; font-weight: 600; color: var(--text-primary);">Category</th>
              <th style="text-align: center; padding: 1rem; font-weight: 600; color: var(--text-primary);">Users</th>
              <th style="text-align: center; padding: 1rem; font-weight: 600; color: var(--text-primary);">Tasks</th>
              <th style="text-align: center; padding: 1rem; font-weight: 600; color: var(--text-primary);">Mentions</th>
              <th style="text-align: center; padding: 1rem; font-weight: 600; color: var(--text-primary);">Actions</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    this.toolsData.forEach(tool => {
      html += `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 1rem; font-weight: 500;">${tool.tool_name}</td>
          <td style="padding: 1rem; color: var(--text-secondary);">
            <span style="background: var(--bg-secondary); padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.875rem;">
              ${tool.category}
            </span>
          </td>
          <td style="padding: 1rem; text-align: center;">${tool.user_count}</td>
          <td style="padding: 1rem; text-align: center;">${tool.conversation_count}</td>
          <td style="padding: 1rem; text-align: center;">${tool.total_mentions}</td>
          <td style="padding: 1rem; text-align: center;">
            <button class="view-tool-details" data-tool="${tool.tool_name}" 
                    style="background: var(--primary-color); color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.875rem;">
              View Details
            </button>
          </td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    content.innerHTML = html;
    
    // Add click handlers for view details buttons
    document.querySelectorAll('.view-tool-details').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const toolName = e.target.dataset.tool;
        this.showToolDetails(toolName);
      });
    });
  }
  
  /**
   * Render tools by category
   */
  renderByCategory() {
    const content = document.getElementById('tools-content');
    if (!content || !this.statsData) return;
    
    let html = '<div class="categories-grid" style="display: grid; gap: 1.5rem;">';
    
    // Sort categories by tool count
    const sortedCategories = Object.entries(this.statsData.by_category)
      .sort((a, b) => b[1].count - a[1].count);
    
    sortedCategories.forEach(([category, data]) => {
      html += `
        <div class="category-card" style="background: var(--card-bg); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border-color);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 style="margin: 0; font-size: 1.125rem;">${category}</h3>
            <span style="background: var(--primary-color); color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.875rem; font-weight: 600;">
              ${data.count} tools
            </span>
          </div>
          <div class="tools-list" style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
      `;
      
      data.tools.forEach(tool => {
        html += `
          <span class="tool-tag" data-tool="${tool.tool_name}" 
                style="background: var(--bg-secondary); padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.875rem; cursor: pointer; transition: background 0.2s;"
                onmouseover="this.style.background='var(--border-color)'"
                onmouseout="this.style.background='var(--bg-secondary)'">
            ${tool.tool_name} <span style="color: var(--text-secondary);">(${tool.user_count} users)</span>
          </span>
        `;
      });
      
      html += `
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    
    content.innerHTML = html;
    
    // Add click handlers
    document.querySelectorAll('.tool-tag').forEach(tag => {
      tag.addEventListener('click', (e) => {
        const toolName = e.target.dataset.tool || e.target.closest('.tool-tag').dataset.tool;
        if (toolName) {
          this.showToolDetails(toolName);
        }
      });
    });
  }
  
  /**
   * Render most used tools
   */
  renderMostUsed() {
    const content = document.getElementById('tools-content');
    if (!content) return;
    
    const topTools = this.statsData?.most_used_tools || this.toolsData.slice(0, 10);
    
    let html = `
      <div class="most-used-tools" style="display: grid; gap: 1rem;">
        <h3 style="margin-bottom: 1rem;">Top 10 Most Widely Used Tools</h3>
    `;
    
    topTools.forEach((tool, index) => {
      const percentage = (tool.user_count / 6) * 100; // Assuming 6 users max
      
      html += `
        <div class="tool-bar" style="background: var(--card-bg); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <span style="font-size: 1.5rem; font-weight: 600; color: var(--text-secondary);">#${index + 1}</span>
              <span style="font-weight: 600; font-size: 1.125rem;">${tool.tool_name}</span>
              <span style="background: var(--bg-secondary); padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.875rem;">
                ${tool.category}
              </span>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.875rem; color: var(--text-secondary);">
                ${tool.user_count} users • ${tool.total_mentions} mentions
              </div>
            </div>
          </div>
          <div style="background: var(--bg-secondary); height: 8px; border-radius: 4px; overflow: hidden;">
            <div style="background: var(--primary-color); height: 100%; width: ${percentage}%; transition: width 0.3s;"></div>
          </div>
          <div style="margin-top: 0.5rem;">
            <button class="view-tool-details-inline" data-tool="${tool.tool_name}"
                    style="background: none; border: none; color: var(--primary-color); cursor: pointer; font-size: 0.875rem; text-decoration: underline;">
              View details →
            </button>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    
    content.innerHTML = html;
    
    // Add click handlers
    document.querySelectorAll('.view-tool-details-inline').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const toolName = e.target.dataset.tool;
        this.showToolDetails(toolName);
      });
    });
  }
  
  /**
   * Show tool details modal
   */
  async showToolDetails(toolName) {
    const modal = document.getElementById('tool-details-modal');
    const nameEl = document.getElementById('tool-detail-name');
    const contentEl = document.getElementById('tool-detail-content');
    
    if (!modal || !nameEl || !contentEl) return;
    
    // Show modal
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    
    // Show loading
    nameEl.textContent = toolName;
    contentEl.innerHTML = '<div style="text-align: center; padding: 2rem;">Loading...</div>';
    
    try {
      // Fetch details
      const details = await this.getToolDetails(toolName);
      
      // Render details
      let html = `
        <div class="tool-details">
          <div style="margin-bottom: 2rem;">
            <div style="display: inline-block; background: var(--bg-secondary); padding: 0.5rem 1rem; border-radius: 12px; margin-bottom: 1rem;">
              ${details.category}
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-top: 1rem;">
              <div style="text-align: center; padding: 1rem; background: var(--bg-secondary); border-radius: 8px;">
                <div style="font-size: 2rem; font-weight: 600;">${details.users.length}</div>
                <div style="font-size: 0.875rem; color: var(--text-secondary);">Users</div>
              </div>
              <div style="text-align: center; padding: 1rem; background: var(--bg-secondary); border-radius: 8px;">
                <div style="font-size: 2rem; font-weight: 600;">${details.total_mentions}</div>
                <div style="font-size: 0.875rem; color: var(--text-secondary);">Total Mentions</div>
              </div>
            </div>
          </div>
          
          <h3 style="margin-bottom: 1rem;">Usage by User</h3>
      `;
      
      details.users.forEach(user => {
        html += `
          <div style="border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <strong>${user.email}</strong>
              <span style="color: var(--text-secondary);">${user.mentions} mentions</span>
            </div>
            <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
              Used in ${user.conversations.length} conversation(s):
            </div>
            <ul style="margin: 0; padding-left: 1.5rem;">
        `;
        
        user.conversations.forEach(conv => {
          html += `
            <li style="margin-bottom: 0.25rem;">
              ${conv.title || 'Untitled'} 
              <span style="color: var(--text-secondary);">(${conv.mentions} mentions)</span>
            </li>
          `;
        });
        
        html += `
            </ul>
          </div>
        `;
      });
      
      html += '</div>';
      
      contentEl.innerHTML = html;
      
    } catch (error) {
      contentEl.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--error-color);">
          Failed to load tool details: ${error.message}
        </div>
      `;
    }
  }
  
  /**
   * Hide tool details modal
   */
  hideToolDetails() {
    const modal = document.getElementById('tool-details-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  }
  
  /**
   * Initialize and load data
   */
  async initialize(containerId) {
    this.renderToolsOverview(containerId);
    
    try {
      await this.loadToolsData();
      this.updateStats();
      this.renderAllTools();
    } catch (error) {
      console.error('Failed to initialize tools manager:', error);
      const content = document.getElementById('tools-content');
      if (content) {
        content.innerHTML = `
          <div style="text-align: center; padding: 3rem; color: var(--error-color);">
            Failed to load tools data: ${error.message}
          </div>
        `;
      }
    }
  }
}

// Export for use in admin dashboard
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminToolsManager;
}
