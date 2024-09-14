import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Plugin settings interface
interface MyPluginSettings {
	interval: number;
	backgrounds: string[];
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	interval: 3000, // 3 seconds
	backgrounds: ["url('https://img.freepik.com/free-photo/geometric-shapes-orange-background_23-2148209958.jpg?size=626&ext=jpg&ga=GA1.1.1174352020.1726297089&semt=ais_hybrid')", "url('https://img.freepik.com/free-photo/geometric-shapes-orange-background_23-2148209958.jpg?size=626&ext=jpg&ga=GA1.1.1174352020.1726297089&semt=ais_hybrid')"],
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	intervalId: number;

	async onload() {
		await this.loadSettings();

		// Start changing backgrounds
		this.startBackgroundChange();

		// Add a settings tab
		this.addSettingTab(new MyPluginSettingTab(this.app, this));
	}

	startBackgroundChange() {
		let index = 0;
		this.intervalId = window.setInterval(() => {
			console.log(this.settings.backgrounds[index]);
			const titleBarTexts = document.querySelectorAll(".view-content") as NodeListOf<HTMLElement>;
			titleBarTexts.forEach((titleBarText, index) => {
				// Apply the background image
				titleBarText.style.backgroundImage = `${this.settings.backgrounds[index]}`;
				titleBarText.style.backgroundSize = "cover";
				titleBarText.style.backgroundPosition = "center";

				// Ensure position relative for the overlay and content
				titleBarText.style.position = "relative";
				titleBarText.style.zIndex = "2";  // Ensure content is above the overlay

				// Check if overlay already exists by class name
				if (!titleBarText.querySelector('.background-overlay')) {
					// Create an overlay div for opacity if it doesn't exist
					const overlay = document.createElement("div");
					overlay.className = "background-overlay"; // Add a class for easy identification
					overlay.style.position = "absolute";
					overlay.style.top = "0";
					overlay.style.left = "0";
					overlay.style.width = "100%";
					overlay.style.height = "100%";
					overlay.style.backgroundColor = "rgba(255, 255, 255, 0.5)";  // White overlay with 85% opacity
					overlay.style.zIndex = "-1";  // Ensure overlay is below the content
					overlay.style.pointerEvents = "none";  // Makes the overlay non-interactive

					// Append the overlay to the titleBarText
					titleBarText.appendChild(overlay);
				}
			});

			index = (index + 1) % this.settings.backgrounds.length;
		}, this.settings.interval);
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

		new Setting(containerEl)
			.setName('Switch Interval (ms)')
			.setDesc('Time between background changes in milliseconds.')
			.addText(text => text
				.setPlaceholder('Enter time in ms')
				.setValue(this.plugin.settings.interval.toString())
				.onChange(async (value) => {
					this.plugin.settings.interval = parseInt(value);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Background Images')
			.setDesc('Comma-separated list of image URLs or colors.')
			.addTextArea(text => text
				.setPlaceholder('Enter image URLs or colors')
				.setValue(this.plugin.settings.backgrounds.join(', '))
				.onChange(async (value) => {
					this.plugin.settings.backgrounds = value.split(',').map(v => v.trim());
					await this.plugin.saveSettings();
				}));
	}
}
