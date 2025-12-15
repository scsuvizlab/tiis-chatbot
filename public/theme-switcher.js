// Theme Switcher - Light/Dark Mode
// Handles theme persistence and switching

class ThemeManager {
    constructor() {
        this.currentTheme = this.loadTheme();
        this.applyTheme(this.currentTheme);
        this.setupThemeToggle();
    }
    
    loadTheme() {
        // Check localStorage first
        const saved = localStorage.getItem('tiis-theme');
        if (saved) return saved;
        
        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        
        return 'light';
    }
    
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        localStorage.setItem('tiis-theme', theme);
        
        // Update any theme selectors on the page
        this.updateThemeSelectors();
    }
    
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
    }
    
    setTheme(theme) {
        this.applyTheme(theme);
    }
    
    updateThemeSelectors() {
        // Update radio buttons or theme options if they exist
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            if (option.dataset.theme === this.currentTheme) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
        
        // Update radio inputs
        const themeRadios = document.querySelectorAll('input[name="theme"]');
        themeRadios.forEach(radio => {
            radio.checked = radio.value === this.currentTheme;
        });
    }
    
    setupThemeToggle() {
        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                if (!localStorage.getItem('tiis-theme')) {
                    this.applyTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
        
        // Setup click handlers for theme options
        document.addEventListener('click', (e) => {
            const themeOption = e.target.closest('.theme-option');
            if (themeOption) {
                const theme = themeOption.dataset.theme;
                if (theme) {
                    this.setTheme(theme);
                }
            }
        });
        
        // Setup change handlers for radio inputs
        document.addEventListener('change', (e) => {
            if (e.target.name === 'theme') {
                this.setTheme(e.target.value);
            }
        });
    }
}

// Initialize theme manager
let themeManager;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        themeManager = new ThemeManager();
    });
} else {
    themeManager = new ThemeManager();
}

// Export for use in other scripts
window.themeManager = themeManager;
