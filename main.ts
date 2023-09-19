import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

const { exec } = require('child_process');
const fs = require("fs");
const basePath = (app.vault.adapter as any).basePath.replaceAll("\\", "/")
const imagesPath = `${basePath}/.obsidian/plugins/obsidian-syntax-tree/images`

function generateSyntaxTree(inputData: string, callback: Callback): void {
    const command = `rsyntaxtree -o "${imagesPath}" -f "svg" -c "off" "${inputData}"`;

    exec(command, (error: { message: any; }, stdout: string, stderr: string) => {
        if (error) {
          callback(new Error(`Error: ${error.message}`), '', '');
          return;
        }
        
        if (stderr) {
          console.error(`Stderr: ${stderr}`);
        }
        
        callback(null, stdout, stderr);
    });
}

// Remember to rename these classes and interfaces!
interface SyntaxTreeSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: SyntaxTreeSettings = {
	mySetting: 'default'
}

export default class SyntaxTree extends Plugin {
	settings: SyntaxTreeSettings;

	async onload() {
		// This adds an editor command that can create new code blocks easily
		this.addCommand({
			id: 'create-code-block',
			name: 'Create a syntax tree code block',
			editorCallback: (editor: Editor, view: MarkdownView) => {
                let currentLine: number = editor.getCursor().line;
                if (/^\s*$/g.test(editor.getLine(currentLine))) {
                    editor.setLine(currentLine, "");
                    editor.replaceRange('```syntax\n\n```', {line: currentLine, ch: 0});
                    editor.setCursor({line: currentLine + 1, ch: 0});
                } else {
                    editor.setLine(currentLine, editor.getLine(currentLine) + "\n");
                    editor.replaceRange('```syntax\n\n```', {line: currentLine + 1, ch: 0});
                    editor.setCursor({line: currentLine + 2, ch: 0});
                }
			}
		});

        // This handles the Code Block Processing
        this.registerMarkdownCodeBlockProcessor("syntax", (source, el, ctx) => {
            generateSyntaxTree(source.replace(/(\r\n|\n|\r)/gm, ""), async (error, output, errorOutput) => {
                if (error) {
                    const div = el.createEl("div", {text: `Error: ${error}`});
                } else {
                    if (output != "") {
                        const div = el.createEl("div", {text: `Parse error: ${error}`});
                    } else {
                        try {
                            var svgContent = await fs.promises.readFile(`${imagesPath}/syntree.svg`, "utf-8");
                            
                            svgContent = svgContent
                            .replace(/white(?!-space)/g, '#262626')
                            .replace(/black/g, '#c7c7c7')
                            .replace(/<svg /, '<svg style="background-color: #262626;" ');

                            var object = document.createElement("object");
                            object.data = `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
                            el.appendChild(object);
                        } catch (error) {
                            const div = el.createEl("div", {text: `Error loading SVG file: ${error}`});
                        }
                    }
                }
            });
        });
    }

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

type Callback = (error: Error | null, stdout: string, stderr: string) => void;

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: SyntaxTree;

	constructor(app: App, plugin: SyntaxTree) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
