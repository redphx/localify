# Localify  
> A Google Chrome extension built to make your deleveoper's life easier.  


## Features:
- Redirect requests to local files so you can debug minified JS/CSS files. Or you can use it to cheat HTML5 games :P
- Simple interface.
- Regex support.

## Installation
1. **[Download source code](https://github.com/redphx/localify/archive/master.zip)** and unzip it.
2. Open the **Extensions** page (*chrome://extensions*) in Google Chrome.
3. Enable **Developer mode**.
4. Click on the **Load unpacked** button and select **source** directory inside the extension's source code.

## How to use
1. Beaytify the minified file and save it to **<extension_dir>/files/** directory.
2. Open extension's option page.
3. Create new rule.
4. Refresh web page containing the original file.

## Limitation
- This extension only works when unpacked. That's why it can't be used in Firefox.
- Doesn't work with inline scripts.
- Doesn't work if the script has [integrity check](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity).
- Can only redirect to local static files (for now).
