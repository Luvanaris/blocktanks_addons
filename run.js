fetch("https://raw.githubusercontent.com/Luvanaris/blocktanks_addons/refs/heads/main/main.js")
.then(response => response.text())
.then(code => {
    let script = document.createElement("script")
    script.textContent = code
    document.body.appendChild(script)
})