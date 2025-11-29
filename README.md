# Mermaid.js with sandboxBaseUrl Feature

This branch contains a pre-built `mermaid.min.js` with the `sandboxBaseUrl` configuration option.

## Usage

Include the script in your HTML:

```html
<script src="https://raw.githubusercontent.com/jmandel-via-jules/mermaid/claude/dist-sandbox-base-url-01HHj4vFA3GQcUgPCsJdQe9T/mermaid.min.js"></script>
<script>
  mermaid.initialize({
    securityLevel: 'sandbox',
    sandboxBaseUrl: window.location.href,  // or your specific base URL
    flowchart: { htmlLabels: false }  // recommended for sandbox mode
  });
</script>
```

## What sandboxBaseUrl Does

When `securityLevel: 'sandbox'` is set, Mermaid renders diagrams inside a data: URI iframe.
Since data URIs have no base URL context, relative links like `./page.html` fail to navigate.

The `sandboxBaseUrl` option pre-resolves all relative URLs to absolute URLs before embedding,
making clickable links work correctly.

## Test Page

Open `test.html` to see the feature in action:
- https://raw.githubusercontent.com/jmandel-via-jules/mermaid/claude/dist-sandbox-base-url-01HHj4vFA3GQcUgPCsJdQe9T/test.html

## Source Branch

The source code for this feature is in branch: `claude/add-sandbox-base-url-01HHj4vFA3GQcUgPCsJdQe9T`
