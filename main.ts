import { Plugin, PluginSettingTab, App, Setting } from 'obsidian';

interface MyPluginSettings {
	backgrounds: string[];
	opacitySettings: {
		viewContent: number;
		tabHeaderContainer: number;
		tabHeader: number;
		workspaceLeaf: number;
		kanbanItem: number;
	};
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	backgrounds: [
		"https://example.com/image1.jpg",
		"https://example.com/image2.jpg",
		"https://example.com/image3.jpg"
	],
	opacitySettings: {
		viewContent: 0.5,
		tabHeaderContainer: 0.4,
		tabHeader: 0.3,
		workspaceLeaf: 0.6,
		kanbanItem: 0.7
	}
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// Add a settings tab
		this.addSettingTab(new MyPluginSettingTab(this.app, this));

		// Add command to trigger background change
		this.addCommand({
			id: 'change-background',
			name: 'Change Background',
			callback: () => this.updateBackgrounds(),
		});

		// Initial background setup
		this.updateBackgrounds();

		// Listen for changes to the active leaf
		this.registerEvent(this.app.workspace.on('active-leaf-change', () => {
			this.updateBackgrounds();
		}));
	}

	getRandomBackground(): string {
		// Get a random background from the settings
		const backgrounds = this.settings.backgrounds;
		const randomIndex = Math.floor(Math.random() * backgrounds.length);
		return backgrounds[randomIndex];
	}

	applyBackgroundAndOverlay(elements: NodeListOf<HTMLElement>, opacity: number) {
		const backgroundImageUrl = this.getRandomBackground();

		elements.forEach((element) => {
			// Apply the background image
			element.style.backgroundImage = `url("${backgroundImageUrl}")`;
			element.style.backgroundSize = "cover";
			element.style.backgroundPosition = "center";
			element.style.position = "relative";
			element.style.zIndex = "2";  // Ensure content is above the overlay
			element.style.boxShadow = "10px 10px 5px 0px rgba(0, 0, 0, 0.75)";
			element.style.border = "1px orange solid";

			// Check if overlay already exists by class name
			if (!element.querySelector('.background-overlay')) {
				// Create an overlay div for opacity if it doesn't exist
				const overlay = document.createElement("div");
				overlay.className = "background-overlay"; // Add a class for easy identification
				overlay.style.position = "absolute";
				overlay.style.top = "0";
				overlay.style.left = "0";
				overlay.style.width = "100%";
				overlay.style.height = "100%";
				overlay.style.backgroundColor = `rgba(255, 255, 255, ${opacity})`;  // Apply the configured opacity
				overlay.style.zIndex = "-1";  // Ensure overlay is below the content
				overlay.style.pointerEvents = "none";  // Makes the overlay non-interactive

				// Append the overlay to the element
				element.appendChild(overlay);
			}
		});
	}

	updateBackgrounds() {
		// Apply random background to different elements with configured opacity
		const titleBarTexts = document.querySelectorAll(".view-content") as NodeListOf<HTMLElement>;
		this.applyBackgroundAndOverlay(titleBarTexts, this.settings.opacitySettings.viewContent);

		const headerContainers = document.querySelectorAll(".workspace-tab-header-container") as NodeListOf<HTMLElement>;
		this.applyBackgroundAndOverlay(headerContainers, this.settings.opacitySettings.tabHeaderContainer);

		const headerTabs = document.querySelectorAll(".workspace-tab-header") as NodeListOf<HTMLElement>;
		this.applyBackgroundAndOverlay(headerTabs, this.settings.opacitySettings.tabHeader);

		const viewHeaders = document.querySelectorAll(".view-header") as NodeListOf<HTMLElement>;
		this.applyBackgroundAndOverlay(viewHeaders, this.settings.opacitySettings.tabHeader);

		const workspaceLeaf = document.querySelectorAll(".workspace-leaf") as NodeListOf<HTMLElement>;
		this.applyBackgroundAndOverlay(workspaceLeaf, this.settings.opacitySettings.workspaceLeaf);

		// Use a single MutationObserver to handle kanban and other dynamically added elements
		const observer = new MutationObserver((mutationsList) => {
			mutationsList.forEach(mutation => {
				// Check if new nodes have been added
				if (mutation.addedNodes.length > 0) {
					// Check for kanban lanes
					const kanbanLane = document.querySelectorAll(".kanban-plugin__lane") as NodeListOf<HTMLElement>;
					if (kanbanLane.length > 0) {
						this.applyBackgroundAndOverlay(kanbanLane, this.settings.opacitySettings.viewContent);
					}

					// Check for kanban items
					const kanbanItems = document.querySelectorAll(".kanban-plugin__item-title-wrapper") as NodeListOf<HTMLElement>;
					if (kanbanItems.length > 0) {
						this.applyBackgroundAndOverlay(kanbanItems, this.settings.opacitySettings.kanbanItem);
					}
				}
			});
		});

		// Start observing the document for changes
		observer.observe(document.body, { childList: true, subtree: true });
	}

	onunload() {
		// Clean up resources when the plugin is unloaded
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// Settings tab class for adjusting backgrounds and opacity settings
class MyPluginSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Settings for Random Background Plugin' });

		// Add a text field for each background URL
		new Setting(containerEl)
			.setName('Background Images')
			.setDesc('Add URLs for background images')
			.addTextArea((text) => text
				.setPlaceholder('Enter URLs separated by commas')
				.setValue(this.plugin.settings.backgrounds.join(', '))
				.onChange(async (value) => {
					this.plugin.settings.backgrounds = value.split(',').map(url => url.trim());
					await this.plugin.saveSettings();
				}));

		// Add sliders for adjusting opacity settings
		this.addOpacitySetting(containerEl, 'viewContent', 'View Content Opacity');
		this.addOpacitySetting(containerEl, 'tabHeaderContainer', 'Tab Header Container Opacity');
		this.addOpacitySetting(containerEl, 'tabHeader', 'Tab Header Opacity');
		this.addOpacitySetting(containerEl, 'workspaceLeaf', 'Workspace Leaf Opacity');
		this.addOpacitySetting(containerEl, 'kanbanItem', 'Kanban Item Opacity');
	}

	addOpacitySetting(containerEl: HTMLElement, key: keyof MyPluginSettings['opacitySettings'], name: string) {
		new Setting(containerEl)
			.setName(name)
			.addSlider((slider) => slider
				.setLimits(0, 1, 0.1)
				.setValue(this.plugin.settings.opacitySettings[key])
				.onChange(async (value) => {
					this.plugin.settings.opacitySettings[key] = value;
					await this.plugin.saveSettings();
				})
				.setDynamicTooltip());
	}
}
