// Admin Knowledge Module Manager UI - FIXED
// Now fetches its own fresh data instead of using stale cache

class AdminKnowledgeManager {
  constructor(apiBase, adminToken) {
    this.API_BASE = apiBase;
    this.adminToken = adminToken;
    this.modules = [];
    this.users = [];
    this.assignments = {}; // user email -> module_id
  }
  
  /**
   * Load fresh user data from API
   */
  async loadUsers() {
    try {
      const response = await fetch(`${this.API_BASE}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${this.adminToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load users');
      }
      
      const data = await response.json();
      this.users = data.users || [];
      
      // Build assignments map from fresh user data
      this.assignments = {};
      this.users.forEach(user => {
        if (user.knowledge_module_id) {
          this.assignments[user.email] = user.knowledge_module_id;
        }
      });
      
      console.log(`👥 Loaded ${this.users.length} users with ${Object.keys(this.assignments).length} module assignments`);
      
      return this.users;
      
    } catch (error) {
      console.error('Error loading users:', error);
      throw error;
    }
  }
  
  /**
   * Load available knowledge modules from API
   */
  async loadModules() {
    try {
      const response = await fetch(`${this.API_BASE}/admin/knowledge/modules`, {
        headers: {
          'Authorization': `Bearer ${this.adminToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load modules');
      }
      
      const data = await response.json();
      this.modules = data.modules || [];
      
      console.log(`📚 Loaded ${this.modules.length} knowledge modules`);
      return this.modules;
      
    } catch (error) {
      console.error('Error loading knowledge modules:', error);
      throw error;
    }
  }
  
  /**
   * Assign or unassign module to user
   */
  async assignModule(email, moduleId) {
    try {
      const response = await fetch(`${this.API_BASE}/admin/knowledge/assign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          module_id: moduleId || null
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to assign module');
      }
      
      const data = await response.json();
      
      console.log(`✅ ${moduleId ? 'Assigned' : 'Unassigned'} module for ${email}`);
      
      // CRITICAL FIX: Reload fresh data after assignment
      await this.loadUsers();
      
      return data.user;
      
    } catch (error) {
      console.error('Error assigning module:', error);
      throw error;
    }
  }
  
  /**
   * Render the knowledge management interface
   */
  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Knowledge container not found');
      return;
    }
    
    container.innerHTML = `
      <div class="knowledge-management">
        <div class="knowledge-header" style="margin-bottom: 2rem;">
          <div>
            <h2 style="margin-bottom: 0.5rem;">📚 Knowledge Modules</h2>
            <p style="color: var(--text-secondary); font-size: 0.9375rem;">
              Assign custom interview modules to users for personalized onboarding
            </p>
          </div>
        </div>
        
        <!-- Stats -->
        <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
          <div class="stat-card" style="background: var(--card-bg); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Available Modules</div>
            <div id="stat-modules-count" style="font-size: 2rem; font-weight: 600; color: var(--text-primary);">-</div>
          </div>
          
          <div class="stat-card" style="background: var(--card-bg); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Assigned Users</div>
            <div id="stat-assigned-count" style="font-size: 2rem; font-weight: 600; color: var(--text-primary);">-</div>
          </div>
          
          <div class="stat-card" style="background: var(--card-bg); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Using Default</div>
            <div id="stat-default-count" style="font-size: 2rem; font-weight: 600; color: var(--text-primary);">-</div>
          </div>
        </div>
        
        <!-- User Assignment Table -->
        <div id="knowledge-assignments-container"></div>
      </div>
    `;
    
    this.updateStats();
    this.renderAssignments();
  }
  
  /**
   * Update stats display
   */
  updateStats() {
    const assignedCount = Object.keys(this.assignments).length;
    const defaultCount = this.users.length - assignedCount;
    
    document.getElementById('stat-modules-count').textContent = this.modules.length;
    document.getElementById('stat-assigned-count').textContent = assignedCount;
    document.getElementById('stat-default-count').textContent = defaultCount;
  }
  
  /**
   * Render user assignments table
   */
  renderAssignments() {
    const container = document.getElementById('knowledge-assignments-container');
    if (!container) return;
    
    if (this.users.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
          No users available
        </div>
      `;
      return;
    }
    
    let html = `
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid var(--border-color);">
            <th style="text-align: left; padding: 1rem;">User</th>
            <th style="text-align: left; padding: 1rem;">Current Module</th>
            <th style="text-align: center; padding: 1rem;">Actions</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    this.users.forEach(user => {
      const currentModule = this.assignments[user.email];
      const moduleInfo = currentModule ? 
        this.modules.find(m => m.id === currentModule || m.module_id === currentModule) : 
        null;
      
      html += `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 1rem;">
            <div style="font-weight: 500;">${user.name}</div>
            <div style="font-size: 0.875rem; color: var(--text-secondary);">${user.email}</div>
          </td>
          <td style="padding: 1rem;">
            ${moduleInfo ? `
              <div style="font-weight: 500; color: var(--primary-color);">📚 ${moduleInfo.title}</div>
              <div style="font-size: 0.875rem; color: var(--text-secondary);">${moduleInfo.description}</div>
            ` : `
              <div style="color: var(--text-secondary);">Using Default Interview</div>
            `}
          </td>
          <td style="padding: 1rem; text-align: center;">
            <button class="btn btn-secondary btn-sm assign-module-btn" data-email="${user.email}" style="padding: 0.5rem 1rem; font-size: 0.875rem;">
              ${currentModule ? 'Change' : 'Assign'} Module
            </button>
          </td>
        </tr>
      `;
    });
    
    html += `
        </tbody>
      </table>
    `;
    
    container.innerHTML = html;
    
    // Add event listeners
    document.querySelectorAll('.assign-module-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const email = e.target.dataset.email;
        this.showAssignmentModal(email);
      });
    });
  }
  
  /**
   * Show modal to assign/change module
   */
  showAssignmentModal(email) {
    const user = this.users.find(u => u.email === email);
    if (!user) return;
    
    const currentModule = this.assignments[email];
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 600px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h2 style="margin: 0;">Assign Knowledge Module</h2>
          <button id="close-assign-modal" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-secondary);">×</button>
        </div>
        
        <div style="margin-bottom: 1.5rem;">
          <p><strong>User:</strong> ${user.name} (${user.email})</p>
          <p style="margin-top: 0.5rem;"><strong>Current:</strong> ${currentModule ? 
            this.modules.find(m => m.id === currentModule || m.module_id === currentModule)?.title || 'Unknown' : 
            'Default Interview'}</p>
        </div>
        
        <div class="form-group">
          <label>Select Module</label>
          <select id="module-select" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px; font-size: 1rem;">
            <option value="">Use Default Interview</option>
            ${this.modules.map(module => `
              <option value="${module.id}" ${currentModule === module.id || currentModule === module.module_id ? 'selected' : ''}>
                ${module.title} - ${module.description}
              </option>
            `).join('')}
          </select>
          <small style="display: block; margin-top: 0.5rem; color: var(--text-secondary);">
            Custom modules override the default onboarding questions
          </small>
        </div>
        
        ${currentModule ? `
          <div style="background: var(--warning-light); padding: 1rem; border-radius: 6px; margin: 1rem 0;">
            <p style="color: var(--text-primary); font-size: 0.875rem; margin: 0;">
              ⚠️ Note: Changing the module only affects new conversations, not existing ones
            </p>
          </div>
        ` : ''}
        
        <div class="modal-actions" style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;">
          <button id="cancel-assign" class="btn btn-secondary">Cancel</button>
          <button id="save-assign" class="btn btn-primary">Save Assignment</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    document.getElementById('close-assign-modal').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    document.getElementById('cancel-assign').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    document.getElementById('save-assign').addEventListener('click', async () => {
      const selectedModule = document.getElementById('module-select').value;
      
      try {
        await this.assignModule(email, selectedModule || null);
        
        // Refresh display with fresh data (already loaded by assignModule)
        this.updateStats();
        this.renderAssignments();
        
        // Close modal
        document.body.removeChild(modal);
        
        // Show success message
        this.showToast(`✅ Updated module assignment for ${user.name}`);
        
      } catch (error) {
        alert('Failed to assign module: ' + error.message);
      }
    });
  }
  
  /**
   * Show temporary success toast
   */
  showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: var(--success-color);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      box-shadow: var(--shadow-lg);
      z-index: 2000;
      animation: slideIn 0.3s ease-out;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }
  
  /**
   * Initialize and load data - FIXED to fetch its own fresh data
   */
  async initialize(containerId) {
    this.render(containerId);
    
    try {
      // Load fresh data from API
      await this.loadModules();
      await this.loadUsers();
      
      // Update display
      this.updateStats();
      this.renderAssignments();
      
    } catch (error) {
      console.error('Failed to initialize knowledge manager:', error);
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = `
          <div style="text-align: center; padding: 3rem; color: var(--error-color);">
            <div style="font-size: 2rem; margin-bottom: 1rem;">❌</div>
            <div style="font-weight: 600; margin-bottom: 0.5rem;">Failed to load knowledge modules</div>
            <div style="font-size: 0.875rem;">${error.message}</div>
            <button class="btn btn-primary" onclick="location.reload()" style="margin-top: 1rem;">
              Try Again
            </button>
          </div>
        `;
      }
    }
  }
}

// Export for use in admin dashboard
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminKnowledgeManager;
}