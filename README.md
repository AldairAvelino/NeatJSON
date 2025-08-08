# NeatJSON

A beautiful and secure Chrome extension to format and explore raw JSON responses with customizable themes.

## 🚀 Features

- **Automatic Detection:** Instantly detects JSON content in browser tabs
- **Rich Visualization:** Color-coded interface with syntax highlighting
- **Multiple Themes:** Includes 8 themes like Catppuccin, Dracula, and One Dark Pro
- **Smart Search:** Easily search for keys and values with highlighted results
- **Collapse/Expand:** Effortlessly navigate through complex JSON structures
- **Quick Copy:** One-click button to copy formatted JSON
- **Customizable Settings:** Choose your preferred theme, font, and indentation style
- **Fully Secure:** No external communication, with strict Content Security Policy (CSP)

## 🛡️ Security

- ✅ Strict Content Security Policy (CSP)
- ✅ No use of `eval()`, `innerHTML` or `Function()`
- ✅ No communication with external servers
- ✅ Uses only native Chrome APIs
- ✅ User input is properly validated
- ✅ Requires only the minimum necessary permissions

## 📦 Installation

### Developer Mode (Recommended for testing)

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **"Developer mode"** in the top right corner
4. Click on "Load unpacked"
5. Select the folder containing the extension
6. The extension will be installed and activated automatically

### Testing the Extension

1. Visit a URL that returns JSON, such as:
   - `https://jsonplaceholder.typicode.com/posts/1`
   - Any REST API that returns JSON

2. The page should automatically be replaced by the NeatJSON

3. Click the extension icon to access the settings popup

## 🎨 Available Themes

- **Light**: Default theme with a white background
- **Dark**: Modern dark mode theme
- **High Contrast**: Enhanced accessibility and readability
- **Catppuccin**: Inspired by the popular VS Code theme
- **Dracula at Night**: Inspired by the popular VS Code theme
- **Noctis**: Inspired by the popular VS Code theme
- **Omni Theme**: Inspired by the popular VS Code theme
- **One Dark Pro**: Inspired by the popular VS Code theme

## ⚙️ Settings

Access the settings by clicking the extension icon:

- **Theme**: Choose from 8 available themes
- **Font**: Select between Inter or Roboto Mono
- **Indentation**: Choose 2, 4, or 8 spaces
- **Preview**: See real-time previews of your changes

## 🔧 Development

### Debug e Logs

To enable debug logs:

1. Open Developer Tools (F12)
2. Go to the Console tab
3. Extension logs will appear with the prefix "NeatJSON"

### Making Changes

To modify the extension:

1. Edit the necessary files
2. Go to `chrome://extensions/`
3. Click the "Reload" button for the extension
4. Test the changes in a new tab

## 📋 Used Permissions

- `storage`: used to save user preferences
- `activeTab`: allows access to the active tab's content only when needed

## 🐛 Troubleshooting

### The extension doesn't detect JSON

- Make sure the response Content-Type is `application/json`
- Ensure the content is valid JSON
- Reload the page after installing the extension

### Settings are not being saved

- Check if Chrome has permission to use storage
- Try disabling and re-enabling the extension

### Themes are not applying correctly

- Clear your browser cache
- Reload the extension in Developer Mode

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributions

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a new branch for your feature
3. Commit your changes
4. Open a Pull Request

## 📞 Support

To report bugs or suggest improvements, please open an issue in the project repository.
