import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Plugin settings interface
interface MyPluginSettings {
	interval: number;
	backgrounds: string[];
	opacitySettings: {
		sidebar: number;
		viewContent: number;
		tabHeaderContainer: number;
		tabHeader: number;
		workspaceLeaf: number;
		kanbanItem: number;
	};
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	interval: 3000, // 3 seconds
	backgrounds: [
		"url('https://img.freepik.com/free-photo/geometric-shapes-orange-background_23-2148209958.jpg?size=626&ext=jpg&ga=GA1.1.1174352020.1726297089&semt=ais_hybrid')",
		"url('https://img.freepik.com/free-photo/geometric-shapes-orange-background_23-2148209958.jpg?size=626&ext=jpg&ga=GA1.1.1174352020.1726297089&semt=ais_hybrid')",
	],
	opacitySettings: {
		sidebar: 0.5,
		viewContent: 0.5,
		tabHeaderContainer: 0.5,
		tabHeader: 0.5,
		workspaceLeaf: 0.5,
		kanbanItem: 0.2,
	},
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	intervalId: number;
	currentBackgroundIndex: number = 0;

	async onload() {
		await this.loadSettings();

		// Start changing backgrounds
		this.startBackgroundChange();

		// Add a settings tab
		this.addSettingTab(new MyPluginSettingTab(this.app, this));

		// Listen for changes to the active leaf
		this.registerEvent(this.app.workspace.on('active-leaf-change', () => {
			this.updateBackgrounds();
		}));
	}

	startBackgroundChange() {
		this.intervalId = window.setInterval(() => {
			this.currentBackgroundIndex = (this.currentBackgroundIndex + 1) % this.settings.backgrounds.length;
			this.updateBackgrounds();
		}, this.settings.interval);
	}

	applyBackgroundAndOverlay(elements: NodeListOf<HTMLElement>, backgroundImageUrl: string, opacity: number) {
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
		const backgroundImageUrl = this.settings.backgrounds[this.currentBackgroundIndex]; // Use the current background image from settings

		// Apply background with configured opacity to different elements
		const titleBarTexts = document.querySelectorAll(".view-content") as NodeListOf<HTMLElement>;
		this.applyBackgroundAndOverlay(titleBarTexts, backgroundImageUrl, this.settings.opacitySettings.viewContent);

		const headerContainers = document.querySelectorAll(".workspace-tab-header-container") as NodeListOf<HTMLElement>;
		this.applyBackgroundAndOverlay(headerContainers, backgroundImageUrl, this.settings.opacitySettings.tabHeaderContainer);

		const headerTabs = document.querySelectorAll(".workspace-tab-header") as NodeListOf<HTMLElement>;
		this.applyBackgroundAndOverlay(headerTabs, backgroundImageUrl, this.settings.opacitySettings.tabHeader);

		const workspaceLeaf = document.querySelectorAll(".workspace-leaf") as NodeListOf<HTMLElement>;
		this.applyBackgroundAndOverlay(workspaceLeaf, backgroundImageUrl, this.settings.opacitySettings.workspaceLeaf);

		// Use a single MutationObserver to handle kanban and other dynamically added elements
		const observer = new MutationObserver((mutationsList) => {
			mutationsList.forEach(mutation => {
				// Check if new nodes have been added
				if (mutation.addedNodes.length > 0) {
					// Check for kanban lanes
					const kanbanLane = document.querySelectorAll(".kanban-plugin__lane") as NodeListOf<HTMLElement>;
					if (kanbanLane.length > 0) {
						this.applyBackgroundAndOverlay(kanbanLane, backgroundImageUrl, this.settings.opacitySettings.viewContent);
					}

					// Check for kanban items
					const kanbanItems = document.querySelectorAll(".kanban-plugin__item-title-wrapper") as NodeListOf<HTMLElement>;
					if (kanbanItems.length > 0) {
						this.applyBackgroundAndOverlay(kanbanItems, backgroundImageUrl, this.settings.opacitySettings.kanbanItem);
					}
				}
			});
		});

		// Start observing the document for changes
		observer.observe(document.body, { childList: true, subtree: true });
	}


	onunload() {
		// Clear the interval when the plugin is unloaded
		window.clearInterval(this.intervalId);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class MyPluginSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Background Switcher Settings' });

		// Setting for switch interval
		new Setting(containerEl)
			.setName('Switch Interval (ms)')
			.setDesc('Time between background changes in milliseconds.')
			.addText(text => text
				.setPlaceholder('Enter time in ms')
				.setValue(this.plugin.settings.interval.toString())
				.onChange(async (value) => {
					this.plugin.settings.interval = parseInt(value);
					await this.plugin.saveSettings();

					// Clear the old interval and restart the background switcher with the new interval
					window.clearInterval(this.plugin.intervalId);
					this.plugin.startBackgroundChange();  // Restart the interval with new settings

					this.plugin.updateBackgrounds();  // Reload backgrounds immediately after the change
				}));

		// Setting for background images
		new Setting(containerEl)
			.setName('Background Images')
			.setDesc('Comma-separated list of image URLs or colors.')
			.addTextArea(text => text
				.setPlaceholder('Enter image URLs or colors')
				.setValue(this.plugin.settings.backgrounds.join(', '))
				.onChange(async (value) => {
					this.plugin.settings.backgrounds = value.split(',').map(v => v.trim());
					await this.plugin.saveSettings();

					this.plugin.updateBackgrounds();  // Reload backgrounds after changing the background images
				}));

		const titleBarTexts = document.querySelectorAll(".view-content") as NodeListOf<HTMLElement>;

		// Add settings for opacity per element
		new Setting(containerEl)
			.setName('Sidebar Opacity')
			.setDesc('Opacity for the sidebar background overlay.')
			.addSlider(slider => slider
				.setLimits(0, 1, 0.1)
				.setValue(this.plugin.settings.opacitySettings.sidebar)
				.onChange(async (value) => {
					this.plugin.settings.opacitySettings.sidebar = value;

					const headerOverlayContainers = document.querySelectorAll(".workspace-tab-header-container .background-overlay") as NodeListOf<HTMLElement>;
					headerOverlayContainers.forEach(cont => {
						cont.style.background = `rgba(255, 255, 255, ${value})`;
					});

					await this.plugin.saveSettings();
					this.plugin.updateBackgrounds();  // Reload backgrounds after changing opacity
				}));

		// Add settings for opacity per element
		new Setting(containerEl)
			.setName('View Content Opacity')
			.setDesc('Opacity for the view content background overlay.')
			.addSlider(slider => slider
				.setLimits(0, 1, 0.1)
				.setValue(this.plugin.settings.opacitySettings.viewContent)
				.onChange(async (value) => {
					this.plugin.settings.opacitySettings.viewContent = value;

					const headerOverlayContainers = document.querySelectorAll(".workspace-tab-header-container .background-overlay") as NodeListOf<HTMLElement>;
					headerOverlayContainers.forEach(cont => {
						cont.style.background = `rgba(255, 255, 255, ${value})`;
					});

					await this.plugin.saveSettings();
					this.plugin.updateBackgrounds();  // Reload backgrounds after changing opacity
				}));

		// Setting for tab header container opacity
		new Setting(containerEl)
			.setName('Tab Header Container Opacity')
			.setDesc('Opacity for the tab header container background overlay.')
			.addSlider(slider => slider
				.setLimits(0, 1, 0.1)
				.setValue(this.plugin.settings.opacitySettings.tabHeaderContainer)
				.onChange(async (value) => {
					this.plugin.settings.opacitySettings.tabHeaderContainer = value;

					const headerOverlayTabs = document.querySelectorAll(".workspace-tab-header .background-overlay") as NodeListOf<HTMLElement>;
					headerOverlayTabs.forEach(tab => {
						tab.style.background = `rgba(255, 255, 255, ${value})`;
					});

					await this.plugin.saveSettings();
					this.plugin.updateBackgrounds();  // Reload backgrounds after changing opacity
				}));

		// Setting for tab header opacity
		new Setting(containerEl)
			.setName('Tab Header Opacity')
			.setDesc('Opacity for the tab header background overlay.')
			.addSlider(slider => slider
				.setLimits(0, 1, 0.1)
				.setValue(this.plugin.settings.opacitySettings.tabHeader)
				.onChange(async (value) => {
					this.plugin.settings.opacitySettings.tabHeader = value;

					const workspaceOverlayLeaves = document.querySelectorAll(".workspace-leaf .background-overlay") as NodeListOf<HTMLElement>;
					workspaceOverlayLeaves.forEach(leave => {
						leave.style.background = `rgba(255, 255, 255, ${value})`;
					});

					await this.plugin.saveSettings();
					this.plugin.updateBackgrounds();  // Reload backgrounds after changing opacity
				}));

		// Setting for workspace leaf opacity
		new Setting(containerEl)
			.setName('Workspace Leaf Opacity')
			.setDesc('Opacity for the workspace leaf background overlay.')
			.addSlider(slider => slider
				.setLimits(0, 1, 0.1)
				.setValue(this.plugin.settings.opacitySettings.workspaceLeaf)
				.onChange(async (value) => {
					this.plugin.settings.opacitySettings.workspaceLeaf = value;

					const kanbanOverlayLanes = document.querySelectorAll(".kanban-plugin__lane .background-overlay") as NodeListOf<HTMLElement>;
					kanbanOverlayLanes.forEach(lane => {
						lane.style.background = `rgba(255, 255, 255, ${value})`;
					});

					await this.plugin.saveSettings();
					this.plugin.updateBackgrounds();  // Reload backgrounds after changing opacity
				}));

		// Setting for kanban item title opacity
		new Setting(containerEl)
			.setName('Kanban Item Title Opacity')
			.setDesc('Opacity for the Kanban item title background overlay.')
			.addSlider(slider => slider
				.setLimits(0, 1, 0.1)
				.setValue(this.plugin.settings.opacitySettings.kanbanItem)
				.onChange(async (value) => {
					this.plugin.settings.opacitySettings.kanbanItem = value;

					const kanbanOverlayItems = document.querySelectorAll(".kanban-plugin__item-title-wrapper .background-overlay") as NodeListOf<HTMLElement>;
					kanbanOverlayItems.forEach(tab => {
						console.log(tab, value);

						tab.style.background = `rgba(255, 255, 255, ${value})`;
					});

					await this.plugin.saveSettings();
					this.plugin.updateBackgrounds();  // Reload backgrounds after changing opacity
				}));
	}
}
