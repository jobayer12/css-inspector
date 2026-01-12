# CSS Inspector Pro

A powerful Chrome extension for inspecting and editing CSS properties in real-time. Perfect for web developers, designers, and anyone who wants to experiment with CSS on any webpage.

![CSS Inspector Pro](icons/icon128.png)

## Features

### 🎯 Visual Element Selection
- **Hover highlighting** - Purple overlay shows elements as you hover
- **Click to inspect** - Pink selection box locks onto clicked elements
- **Element dimensions** - See width × height in real-time
- **Smart selector display** - Shows tag, ID, and class information

### 🎨 Real-Time CSS Editing
- **Live updates** - See changes instantly as you type
- **Multiple input types**:
  - Text inputs for most properties
  - Color pickers for color properties
  - Smart dropdowns for properties with predefined values
- **Property organization** - Grouped by category (Typography, Colors, Layout, etc.)
- **Add custom properties** - Add any CSS property not shown by default

### ↩️ Granular Revert System
- **Per-property revert** - Undo individual property changes with dedicated revert buttons
- **Visual indicators** - Modified properties are highlighted with yellow background
- **Global revert** - Reset all changes at once with the header revert button
- **Smart tracking** - Only shows revert buttons for modified properties

### 📦 Box Model Visualization
- **Interactive diagram** - Visual representation of margin, border, padding, and content
- **Real-time values** - See actual computed dimensions
- **Nested layout** - Clear visual hierarchy of the box model

### 📋 Multiple View Tabs
- **Styles** - Organized CSS properties by category
- **All Properties** - Complete list of all computed styles with search
- **HTML** - Formatted HTML source of the selected element

### 🔍 Property Search
- Search through all computed CSS properties
- Instant filtering as you type
- View any CSS property applied to the element

### 📄 Copy & Export
- **Copy individual properties** - Click copy button next to any property
- **Copy all styles** - Export common styles for the element
- **Copy HTML** - Get the element's HTML markup

## Installation

### From Chrome Web Store
*(Coming soon)*

### Manual Installation
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the extension directory

## Usage

### Getting Started
1. Click the CSS Inspector extension icon in your Chrome toolbar
2. The inspector will activate on the current page
3. Hover over elements to preview
4. Click any element to inspect its CSS

### Editing CSS Properties
1. Select an element by clicking on it
2. In the inspector panel, modify any property value:
   - Type directly in text fields
   - Use color pickers for colors
   - Select from dropdowns for predefined values
3. See changes applied instantly to the page
4. A yellow highlight and revert button appear for modified properties

### Reverting Changes
- **Individual property**: Click the circular arrow button next to the property
- **All changes**: Click the revert button in the header (appears when any property is modified)

### Adding Custom Properties
1. Scroll to the bottom of the Styles tab
2. Click "Add other CSS element"
3. Select a property from the dropdown
4. Enter or select a value
5. Click "Add Property"

### Keyboard Shortcuts
- `Esc` - Close the inspector

## Technical Details

### Browser Compatibility
- Chrome (Manifest V3)
- Microsoft Edge (Chromium-based)
- Other Chromium-based browsers

### Permissions
- `activeTab` - To interact with the current page
- `storage` - To save user preferences (if applicable)

### Architecture
- **content.js** - Main content script that handles element inspection and UI
- **styles.css** - Styling for the inspector panel and overlays
- **background.js** - Service worker for extension management
- **manifest.json** - Extension configuration

## Features in Detail

### Property Editing Intelligence
The extension includes smart dropdowns for properties with common values:
- Font weights (100-900, normal, bold, etc.)
- Display types (block, flex, grid, etc.)
- Position types (static, relative, absolute, etc.)
- Text alignment (left, center, right, etc.)
- And many more!

### Visual Feedback
- **Purple overlay** - Element under cursor
- **Pink selection box** - Currently inspected element
- **Yellow highlight** - Modified properties
- **Amber revert buttons** - Available for changed properties

### Box Model Display
The box model visualization shows:
- **Margin** (yellow layer)
- **Border** (purple layer)
- **Padding** (blue layer)
- **Content** (purple gradient center)
- Real pixel values for all edges

## Development

### Project Structure
```
css-inspector-extension/
├── manifest.json          # Extension configuration
├── content.js            # Main content script
├── styles.css           # Inspector styles
├── background.js        # Service worker
├── icons/              # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md           # This file
```

### Building
No build process required - this is a pure JavaScript extension.

### Contributing
Contributions are welcome! Please feel free to submit issues and pull requests.

## Privacy

This extension:
- ✅ Only runs when you activate it
- ✅ Does not collect any user data
- ✅ Does not send data to external servers
- ✅ Only modifies CSS temporarily (changes are not permanent)
- ✅ Does not track your browsing

All changes are local to your browser session and are lost when you refresh the page.

## Limitations

- CSS changes are temporary and not saved to the actual website files
- Changes are lost on page refresh
- Cannot edit CSS in iframes from different origins
- Some dynamically generated styles may not be editable

## Troubleshooting

### Extension not activating
- Make sure you've clicked the extension icon
- Try refreshing the page and activating again
- Check if the page allows content scripts (some secure pages don't)

### Changes not applying
- Make sure you're editing the correct element
- Some properties may be overridden by more specific CSS rules
- Try using `!important` in the value (though not recommended)

### Revert button not appearing
- Changes must be different from the original computed value
- Make sure the element was properly inspected before editing
- Try refreshing and re-inspecting the element

## License

MIT License - feel free to use, modify, and distribute.

## Author

Created with ❤️ for web developers

## Changelog

### Version 1.0.0
- Initial release
- Real-time CSS editing
- Per-property revert functionality
- Box model visualization
- Multiple view tabs
- Property search
- Color picker support
- Smart dropdown menus

---

**Note**: This extension modifies page styles temporarily for experimentation and learning purposes. Changes are not permanent and do not affect the actual website files.
