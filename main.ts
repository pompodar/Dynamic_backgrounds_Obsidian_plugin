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
	private observer: MutationObserver;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new MyPluginSettingTab(this.app, this));

		this.addCommand({
			id: 'change-background',
			name: 'Change Background',
			callback: () => this.updateBackgrounds(),
		});

		// Create the MutationObserver once
		this.observer = new MutationObserver(this.handleMutations.bind(this));
		this.observer.observe(document.body, { childList: true, subtree: true });

		// Initial background setup
		this.updateBackgrounds();

		// Use debounce for the leaf change event
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', this.debounce(this.updateBackgrounds.bind(this), 300))
		);
	}

	onunload() {
		// Clean up resources when the plugin is unloaded
		this.observer.disconnect();
		this.removeBackgrounds();
	}

	private debounce(func: Function, wait: number) {
		let timeout: NodeJS.Timeout;
		return (...args: any[]) => {
			clearTimeout(timeout);
			timeout = setTimeout(() => func(...args), wait);
		};
	}

	private removeBackgrounds() {
		document.querySelectorAll('.dynamic-backgrounds').forEach((el) => {
			(el as HTMLElement).style.backgroundImage = '';
			el.classList.remove('dynamic-backgrounds');
			el.querySelector('.dynamic-backgrounds-overlay')?.remove();
		});
	}

	getRandomBackground(): string {
		const backgrounds = this.settings.backgrounds;
		const randomIndex = Math.floor(Math.random() * backgrounds.length);
		return backgrounds[randomIndex];
	}

	applyBackgroundAndOverlay(elements: NodeListOf<HTMLElement>, opacity: number) {
		const backgroundImageUrl = this.getRandomBackground();

		elements.forEach((element) => {
			element.style.backgroundImage = `url("${backgroundImageUrl}")`;

			if (!element.querySelector('.dynamic-backgrounds-overlay')) {
				const overlay = document.createElement("div");
				overlay.className = "dynamic-backgrounds-overlay";
				overlay.style.backgroundColor = `rgba(255, 255, 255, ${opacity})`;
				element.appendChild(overlay);
			}
		});
	}

	updateBackgrounds() {
		const selectors = [
			{ selector: ".view-content", opacity: this.settings.opacitySettings.viewContent },
			{ selector: ".workspace-tab-header-container", opacity: this.settings.opacitySettings.tabHeaderContainer },
			{ selector: ".workspace-tab-header", opacity: this.settings.opacitySettings.tabHeader },
			{ selector: ".view-header", opacity: this.settings.opacitySettings.tabHeader },
			{ selector: ".workspace-leaf", opacity: this.settings.opacitySettings.workspaceLeaf },
		];

		selectors.forEach(({ selector, opacity }) => {
			const elements = document.querySelectorAll(selector) as NodeListOf<HTMLElement>;
			elements.forEach(el => el.classList.add("dynamic-backgrounds"));
			this.applyBackgroundAndOverlay(elements, opacity);
		});
	}

	private handleMutations(mutationsList: MutationRecord[]) {
		for (const mutation of mutationsList) {
			if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
				const kanbanLane = document.querySelectorAll(".kanban-plugin__lane") as NodeListOf<HTMLElement>;
				const kanbanItems = document.querySelectorAll(".kanban-plugin__item-title-wrapper") as NodeListOf<HTMLElement>;

				if (kanbanLane.length > 0) {
					kanbanLane.forEach(el => el.classList.add("dynamic-backgrounds"));
					this.applyBackgroundAndOverlay(kanbanLane, this.settings.opacitySettings.viewContent);
				}

				if (kanbanItems.length > 0) {
					kanbanItems.forEach(el => el.classList.add("dynamic-backgrounds"));
					this.applyBackgroundAndOverlay(kanbanItems, this.settings.opacitySettings.kanbanItem);
				}
			}
		}
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

		containerEl.createEl('h2', { text: 'Settings for Random Background Plugin' });

		new Setting(containerEl)
			.setName('Dynamic Background Images')
			.setDesc('Add URLs for background images')
			.addTextArea((text) => text
				.setPlaceholder('Enter URLs separated by commas')
				.setValue(this.plugin.settings.backgrounds.join(', '))
				.onChange(async (value) => {
					const urls = value.split(',').map(url => url.trim());
					this.plugin.settings.backgrounds = urls.filter(url => this.isValidUrl(url));
					await this.plugin.saveSettings();
				}));

		// Add sliders for adjusting opacity settings
		Object.keys(this.plugin.settings.opacitySettings).forEach((key) => {
			this.addOpacitySetting(containerEl, key as keyof MyPluginSettings['opacitySettings'], `${key.charAt(0).toUpperCase() + key.slice(1)} Opacity`);
		});
	}

	private isValidUrl(url: string): boolean {
		try {
			new URL(url);
			return true;
		} catch {
			console.warn(`Invalid URL: ${url}`);
			return false;
		}
	}

	private addOpacitySetting(containerEl: HTMLElement, key: keyof MyPluginSettings['opacitySettings'], name: string) {
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
