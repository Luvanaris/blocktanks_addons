(function () {
    class OverlayMenu {
        constructor(config = {}) {
            this.config = {
                menuId: config.menuId || "game-overlay-menu",
                defaultPosition: config.defaultPosition || { x: 50, y: 50 },
                zIndex: config.zIndex || 9999
            }

            this.sections = {}
            this.tabs = {}
            this.state = {
                isDragging: false,
                dragOffset: { x: 0, y: 0 },
                options: {},
                optionTypes: {},
                optionCallbacks: {},
                optionValidators: {},
                isCollapsed: false,
                activeTab: null,
                hasTabs: false,
                expandedWidth: null,
                inputFocused: false,
                autoReapplyInterval: null,
                isAutoReapplying: false
            }

            this.init()
        }

        init() {
            this.injectStyles()
            this.createMenu()
            this.attachEventListeners()
            this.loadPosition()
            this.loadCollapsedState()
            this.loadOptions()
            document.body.appendChild(this.menu)
            this.detectAndApplyTheme()
            this.startAutoReapply()
        }

        injectStyles() {
            let style = document.createElement("style")
            style.textContent = `
                #${this.config.menuId} {
                    position: fixed;
                    left: ${this.config.defaultPosition.x}px;
                    top: ${this.config.defaultPosition.y}px;
                    min-width: 320px;
                    max-width: 90vw;
                    width: auto;
                    background: rgba(255, 255, 255, 0.08);
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3),
                                0 0 0 1px rgba(255, 255, 255, 0.15),
                                inset 0 1px 0 rgba(255, 255, 255, 0.2);
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    color: rgba(255, 255, 255, 0.95);
                    z-index: ${this.config.zIndex};
                    user-select: none;
                    backdrop-filter: blur(20px) saturate(180%);
                    -webkit-backdrop-filter: blur(20px) saturate(180%);
                }

                #${this.config.menuId}.dragging {
                    cursor: grabbing !important;
                }

                #${this.config.menuId} .menu-header {
                    background: rgba(255, 255, 255, 0.05);
                    padding: 16px 20px;
                    border-radius: 12px 12px 0 0;
                    cursor: grab;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    border-bottom-left-radius: 0;
                    border-bottom-right-radius: 0;
                }

                #${this.config.menuId} .menu-header:active {
                    cursor: grabbing;
                }

                #${this.config.menuId} .menu-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: rgba(255, 255, 255, 0.95);
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
                    margin: 0;
                }

                #${this.config.menuId} .menu-icon {
                    width: 24px;
                    height: 24px;
                    opacity: 0.8;
                    cursor: pointer;
                    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2));
                }

                #${this.config.menuId} .menu-body {
                    overflow: hidden;
                }

                #${this.config.menuId}.collapsed .menu-body {
                    display: none;
                }

                #${this.config.menuId} .menu-content {
                    max-height: 500px;
                    overflow-y: auto;
                }

                #${this.config.menuId}.collapsed {
                    border-radius: 12px;
                    overflow: hidden;
                }

                #${this.config.menuId}.collapsed .menu-header {
                    border-radius: 12px;
                    border-bottom: none;
                }

                #${this.config.menuId} .menu-content::-webkit-scrollbar {
                    width: 6px;
                }

                #${this.config.menuId} .menu-content::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 6px;
                }

                #${this.config.menuId} .menu-content::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.25);
                    border-radius: 6px;
                }

                #${this.config.menuId} .menu-content::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.35);
                }

                #${this.config.menuId} .option-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 0;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                }

                #${this.config.menuId} .section-container .option-item:last-child,
                #${this.config.menuId} .no-section-options .option-item:last-child {
                    border-bottom: none;
                    padding-bottom: 0;
                }

                #${this.config.menuId} .section-container .option-item:first-child,
                #${this.config.menuId} .no-section-options .option-item:first-child {
                    padding-top: 0;
                }

                #${this.config.menuId} .option-label {
                    font-size: 14px;
                    color: rgba(255, 255, 255, 0.9);
                    flex: 1;
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
                }

                #${this.config.menuId} .toggle-switch {
                    position: relative;
                    width: 50px;
                    height: 26px;
                    background: rgba(255, 255, 255, 0.15);
                    border-radius: 12px;
                    cursor: pointer;
                    flex-shrink: 0;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    backdrop-filter: blur(5px);
                    -webkit-backdrop-filter: blur(5px);
                }

                #${this.config.menuId} .toggle-switch:hover {
                    background: rgba(255, 255, 255, 0.2);
                }

                #${this.config.menuId} .toggle-switch.active {
                    background: rgba(100, 255, 218, 0.4);
                    border-color: rgba(100, 255, 218, 0.6);
                }

                #${this.config.menuId} .toggle-switch.active:hover {
                    background: rgba(100, 255, 218, 0.5);
                }

                #${this.config.menuId} .toggle-switch::after {
                    content: "";
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.95);
                    top: 3px;
                    left: 3px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3),
                                inset 0 1px 0 rgba(255, 255, 255, 0.5);
                }

                #${this.config.menuId} .toggle-switch.active::after {
                    transform: translateX(24px);
                    box-shadow: 0 2px 8px rgba(100, 255, 218, 0.5),
                                inset 0 1px 0 rgba(255, 255, 255, 0.5);
                }

                #${this.config.menuId} .section-container {
                    padding: 20px;
                }

                #${this.config.menuId} .no-section-options {
                    padding: 20px;
                }

                #${this.config.menuId} .option-input {
                    width: 120px;
                    padding: 8px 12px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 6px;
                    color: rgba(255, 255, 255, 0.95);
                    font-size: 14px;
                    font-family: inherit;
                    outline: none;
                    flex-shrink: 0;
                    backdrop-filter: blur(5px);
                    -webkit-backdrop-filter: blur(5px);
                    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
                }

                #${this.config.menuId} .option-input::placeholder {
                    color: rgba(255, 255, 255, 0.5);
                }

                #${this.config.menuId} .option-input:focus {
                    background: rgba(255, 255, 255, 0.15);
                    border-color: rgba(255, 255, 255, 0.3);
                }

                #${this.config.menuId} .option-input.error {
                    border-color: rgba(255, 82, 82, 0.6);
                    background: rgba(255, 82, 82, 0.15);
                }

                #${this.config.menuId} .option-input[type="number"] {
                    width: 100px;
                }

                #${this.config.menuId} .tabs-container {
                    display: flex;
                    background: rgba(255, 255, 255, 0.03);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
                    overflow-x: auto;
                    overflow-y: hidden;
                    width: 100%;
                    justify-content: space-evenly;
                    backdrop-filter: blur(5px);
                    -webkit-backdrop-filter: blur(5px);
                }

                #${this.config.menuId} .tabs-container::-webkit-scrollbar {
                    height: 4px;
                }

                #${this.config.menuId} .tabs-container::-webkit-scrollbar-track {
                    background: transparent;
                }

                #${this.config.menuId} .tabs-container::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.25);
                    border-radius: 6px;
                }

                #${this.config.menuId} .tab {
                    padding: 12px 16px;
                    cursor: pointer;
                    font-size: 14px;
                    color: rgba(255, 255, 255, 0.7);
                    border-bottom: 2px solid transparent;
                    white-space: nowrap;
                    flex: 1;
                    text-align: center;
                    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
                }

                #${this.config.menuId} .tab:hover {
                    color: rgba(255, 255, 255, 0.85);
                }

                #${this.config.menuId} .tab.active {
                    color: rgba(255, 255, 255, 0.95);
                    border-bottom-color: rgba(100, 255, 218, 0.7);
                }

                #${this.config.menuId} .section-container {
                    display: none;
                }

                #${this.config.menuId} .section-container.active {
                    display: block;
                }

                #${this.config.menuId} .no-section-options {
                    display: none;
                }

                #${this.config.menuId} .no-section-options.active {
                    display: block;
                }

                #${this.config.menuId}.dark-mode {
                    background: rgba(0, 0, 0, 0.6);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5),
                                0 0 0 1px rgba(0, 0, 0, 0.3),
                                inset 0 1px 0 rgba(255, 255, 255, 0.1);
                }

                #${this.config.menuId}.dark-mode .menu-header {
                    background: rgba(0, 0, 0, 0.4);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                }

                #${this.config.menuId}.dark-mode .tabs-container {
                    background: rgba(0, 0, 0, 0.2);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                }

                #${this.config.menuId}.dark-mode .menu-content::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.2);
                }

                #${this.config.menuId}.dark-mode .menu-content::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.15);
                }

                #${this.config.menuId}.dark-mode .menu-content::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.25);
                }

                #${this.config.menuId}.dark-mode .option-item {
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }

                #${this.config.menuId}.dark-mode .toggle-switch {
                    background: rgba(0, 0, 0, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                }

                #${this.config.menuId}.dark-mode .toggle-switch:hover {
                    background: rgba(0, 0, 0, 0.5);
                }

                #${this.config.menuId}.dark-mode .toggle-switch.active {
                    background: rgba(100, 255, 218, 0.5);
                    border-color: rgba(100, 255, 218, 0.7);
                }

                #${this.config.menuId}.dark-mode .toggle-switch.active:hover {
                    background: rgba(100, 255, 218, 0.6);
                }

                #${this.config.menuId}.dark-mode .option-input {
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                }

                #${this.config.menuId}.dark-mode .option-input:focus {
                    background: rgba(0, 0, 0, 0.4);
                    border-color: rgba(255, 255, 255, 0.25);
                }

                #${this.config.menuId}.dark-mode .option-input.error {
                    border-color: rgba(255, 82, 82, 0.7);
                    background: rgba(255, 82, 82, 0.2);
                }

                #${this.config.menuId}.dark-mode .tabs-container::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.15);
                }
            `
            document.head.appendChild(style)
        }

        getBackgroundColor() {
            let bodyStyle = window.getComputedStyle(document.body)
            let htmlStyle = window.getComputedStyle(document.documentElement)

            let bgColor = bodyStyle.backgroundColor || htmlStyle.backgroundColor || "rgb(255, 255, 255)"

            if (bgColor === "transparent" || bgColor === "rgba(0, 0, 0, 0)") {
                bgColor = htmlStyle.backgroundColor || bodyStyle.backgroundColor || "rgb(255, 255, 255)"
            }

            if (bgColor === "transparent" || bgColor === "rgba(0, 0, 0, 0)") {
                return "rgb(255, 255, 255)"
            }

            return bgColor
        }

        parseColorToRgb(color) {
            if (!color) return { r: 255, g: 255, b: 255 }

            if (color.startsWith("rgb")) {
                let match = color.match(/\d+/g)
                if (match && match.length >= 3) {
                    return {
                        r: parseInt(match[0]),
                        g: parseInt(match[1]),
                        b: parseInt(match[2])
                    }
                }
            } else if (color.startsWith("#")) {
                let hex = color.slice(1)
                if (hex.length === 3) {
                    hex = hex.split("").map(c => c + c).join("")
                }
                if (hex.length === 6) {
                    return {
                        r: parseInt(hex.slice(0, 2), 16),
                        g: parseInt(hex.slice(2, 4), 16),
                        b: parseInt(hex.slice(4, 6), 16)
                    }
                }
            }

            return { r: 255, g: 255, b: 255 }
        }

        rgbToLuminance(color) {
            let rgb = this.parseColorToRgb(color)

            let r = rgb.r / 255
            let g = rgb.g / 255
            let b = rgb.b / 255

            r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4)
            g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4)
            b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4)

            return 0.2126 * r + 0.7152 * g + 0.0722 * b
        }

        detectAndApplyTheme() {
            let bgColor = this.getBackgroundColor()
            let luminance = this.rgbToLuminance(bgColor)

            if (luminance > 0.5) {
                this.menu.classList.add("dark-mode")
            } else {
                this.menu.classList.remove("dark-mode")
            }
        }

        createMenu() {
            this.menu = document.createElement("div")
            this.menu.id = this.config.menuId
            this.menu.innerHTML = `
                <div class="menu-header">
                    <h3 class="menu-title">BlockTanks Addons</h3>
                    <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 12h18M3 6h18M3 18h18"/>
                    </svg>
                </div>
                <div class="menu-body">
                    <div class="tabs-container"></div>
                    <div class="menu-content">
                        <div class="no-section-options"></div>
                    </div>
                </div>
            `
            this.menuBody = this.menu.querySelector(".menu-body")
            this.menuContent = this.menu.querySelector(".menu-content")
            this.tabsContainer = this.menu.querySelector(".tabs-container")
            this.noSectionOptions = this.menu.querySelector(".no-section-options")
            this.header = this.menu.querySelector(".menu-header")
            this.menuIcon = this.menu.querySelector(".menu-icon")
        }

        attachEventListeners() {
            this.header.addEventListener("mousedown", (e) => this.handleHeaderMouseDown(e))
            this.header.addEventListener("touchstart", (e) => this.handleHeaderTouchStart(e), { passive: false })
            this.menuIcon.addEventListener("click", (e) => {
                e.stopPropagation()
                this.toggleCollapse()
            })
            this.menuIcon.addEventListener("touchend", (e) => {
                e.stopPropagation()
                e.preventDefault()
                this.toggleCollapse()
            })
            this.header.addEventListener("mouseup", () => this.savePosition())
            this.header.addEventListener("touchend", () => this.savePosition())
            this.setupInputEventPausing()
        }

        setupInputEventPausing() {
            this.handleKeyDown = (e) => {
                if (this.state.inputFocused) {
                    e.stopPropagation()
                    e.stopImmediatePropagation()
                }
            }

            this.handleKeyUp = (e) => {
                if (this.state.inputFocused) {
                    e.stopPropagation()
                    e.stopImmediatePropagation()
                }
            }

            this.handleKeyPress = (e) => {
                if (this.state.inputFocused) {
                    e.stopPropagation()
                    e.stopImmediatePropagation()
                }
            }

            this.handleMouseDown = (e) => {
                if (this.state.inputFocused && !this.menu.contains(e.target)) {
                    e.stopPropagation()
                }
            }

            this.handleTouchStart = (e) => {
                if (this.state.inputFocused && !this.menu.contains(e.target)) {
                    e.stopPropagation()
                }
            }

            document.addEventListener("keydown", this.handleKeyDown, true)
            document.addEventListener("keyup", this.handleKeyUp, true)
            document.addEventListener("keypress", this.handleKeyPress, true)
            document.addEventListener("mousedown", this.handleMouseDown, true)
            document.addEventListener("touchstart", this.handleTouchStart, true)

            if (typeof game !== "undefined" && game.input) {
                this.originalInputEnabled = game.input.enabled
            }
        }

        pauseGameEvents() {
            this.state.inputFocused = true
            if (typeof game !== "undefined" && game.input) {
                game.input.enabled = false
            }
        }

        resumeGameEvents() {
            this.state.inputFocused = false
            if (typeof game !== "undefined" && game.input) {
                game.input.enabled = true
            }
        }

        handleHeaderMouseDown(e) {
            if (e.target === this.menuIcon || this.menuIcon.contains(e.target)) return
            e.preventDefault()
            this.state.isDragging = true
            this.menu.classList.add("dragging")
            let rect = this.menu.getBoundingClientRect()
            this.state.dragOffset.x = e.clientX - rect.left
            this.state.dragOffset.y = e.clientY - rect.top
            document.addEventListener("mousemove", this.handleMouseMove = (e) => this.onMouseMove(e))
            document.addEventListener("mouseup", this.handleMouseUp = () => this.onMouseUp())
        }

        handleHeaderTouchStart(e) {
            if (e.target === this.menuIcon || this.menuIcon.contains(e.target)) return
            e.preventDefault()
            let touch = e.touches[0]
            this.state.isDragging = true
            this.menu.classList.add("dragging")
            let rect = this.menu.getBoundingClientRect()
            this.state.dragOffset.x = touch.clientX - rect.left
            this.state.dragOffset.y = touch.clientY - rect.top
            document.addEventListener("touchmove", this.handleTouchMove = (e) => this.onTouchMove(e), { passive: false })
            document.addEventListener("touchend", this.handleTouchEnd = () => this.onTouchEnd())
        }

        onMouseMove(e) {
            if (!this.state.isDragging) return

            let x = e.clientX - this.state.dragOffset.x
            let y = e.clientY - this.state.dragOffset.y

            let maxX = window.innerWidth - this.menu.offsetWidth
            let maxY = window.innerHeight - this.menu.offsetHeight
            this.menu.style.left = Math.max(0, Math.min(x, maxX)) + "px"
            this.menu.style.top = Math.max(0, Math.min(y, maxY)) + "px"
        }

        onMouseUp() {
            if (this.state.isDragging) {
                this.state.isDragging = false
                this.menu.classList.remove("dragging")
                document.removeEventListener("mousemove", this.handleMouseMove)
                document.removeEventListener("mouseup", this.handleMouseUp)
            }
        }

        onTouchMove(e) {
            if (!this.state.isDragging) return
            e.preventDefault()

            let touch = e.touches[0]
            let x = touch.clientX - this.state.dragOffset.x
            let y = touch.clientY - this.state.dragOffset.y

            let maxX = window.innerWidth - this.menu.offsetWidth
            let maxY = window.innerHeight - this.menu.offsetHeight
            this.menu.style.left = Math.max(0, Math.min(x, maxX)) + "px"
            this.menu.style.top = Math.max(0, Math.min(y, maxY)) + "px"
        }

        onTouchEnd() {
            if (this.state.isDragging) {
                this.state.isDragging = false
                this.menu.classList.remove("dragging")
                document.removeEventListener("touchmove", this.handleTouchMove)
                document.removeEventListener("touchend", this.handleTouchEnd)
            }
        }

        addSection(sectionName, switchTo = false) {
            if (this.sections[sectionName]) return this.sections[sectionName]

            this.state.hasTabs = true

            let tab = document.createElement("div")
            tab.className = "tab"
            tab.textContent = sectionName
            tab.dataset.section = sectionName
            tab.addEventListener("click", () => this.switchTab(sectionName))
            tab.addEventListener("touchend", (e) => {
                e.preventDefault()
                this.switchTab(sectionName)
            })
            this.tabsContainer.appendChild(tab)
            this.tabs[sectionName] = tab

            let sectionContainer = document.createElement("div")
            sectionContainer.className = "section-container"
            sectionContainer.dataset.section = sectionName
            this.menuContent.appendChild(sectionContainer)
            this.sections[sectionName] = sectionContainer

            if (this.state.activeTab === null || switchTo) {
                this.switchTab(sectionName)
            }

            this.updateTabsVisibility()

            return sectionContainer
        }

        switchTab(sectionName) {
            if (!this.sections[sectionName]) return

            this.state.activeTab = sectionName

            Object.values(this.sections).forEach(container => {
                container.classList.remove("active")
            })

            Object.values(this.tabs).forEach(tab => {
                tab.classList.remove("active")
            })

            if (this.sections[sectionName]) {
                this.sections[sectionName].classList.add("active")
            }

            if (this.tabs[sectionName]) {
                this.tabs[sectionName].classList.add("active")
            }

            if (this.noSectionOptions.children.length > 0) {
                this.noSectionOptions.classList.add("active")
            }
        }

        updateTabsVisibility() {
            if (this.state.isCollapsed) {
                return
            }

            if (this.state.hasTabs && Object.keys(this.sections).length > 0) {
                this.tabsContainer.style.display = "flex"
                this.updateMenuWidth()
            } else {
                this.tabsContainer.style.display = "none"
                this.menu.style.width = "320px"
            }
        }

        updateMenuWidth() {
            if (!this.state.hasTabs) return

            let tabsWidth = 0
            Object.values(this.tabs).forEach(tab => {
                tabsWidth += tab.offsetWidth
            })

            let minWidth = 320
            let calculatedWidth = Math.max(minWidth, tabsWidth + 40)
            let maxWidth = window.innerWidth * 0.9

            this.menu.style.width = Math.min(calculatedWidth, maxWidth) + "px"
        }

        addOption(optionName, label, options = {}) {
            if (this.state.options.hasOwnProperty(optionName)) {
                return
            }

            let {
                section = null,
                type = "toggle",
                defaultValue = false,
                callback = null,
                validator = null,
                inputType = "text",
                placeholder = "",
                min = null,
                max = null,
                step = null
            } = options

            let savedValue = this.getSavedOption(optionName)
            let initialValue = savedValue !== null ? savedValue : defaultValue

            let sectionContainer = section ? this.sections[section] : null
            if (section && !sectionContainer) {
                sectionContainer = this.addSection(section)
            }

            let optionItem = document.createElement("div")
            optionItem.className = "option-item"

            let controlHTML = ""
            if (type === "toggle") {
                controlHTML = `<div class="toggle-switch" data-option="${optionName}"></div>`
                this.state.options[optionName] = initialValue
                this.state.optionTypes[optionName] = "toggle"
            } else if (type === "input") {
                let inputAttrs = `class="option-input" data-option="${optionName}" type="${inputType}" placeholder="${placeholder}"`
                if (inputType === "number") {
                    if (min !== null) inputAttrs += ` min="${min}"`
                    if (max !== null) inputAttrs += ` max="${max}"`
                    if (step !== null) inputAttrs += ` step="${step}"`
                }
                controlHTML = `<input ${inputAttrs} value="${initialValue}">`
                this.state.options[optionName] = initialValue
                this.state.optionTypes[optionName] = "input"
            } else if (type === "toggle-input") {
                let toggleEnabled = false
                let inputValue = ""

                if (typeof initialValue === "object" && initialValue !== null) {
                    toggleEnabled = initialValue.enabled === true
                    inputValue = initialValue.value !== undefined ? initialValue.value : ""
                } else {
                    toggleEnabled = initialValue !== false && initialValue !== ""
                    inputValue = typeof initialValue === "string" || typeof initialValue === "number" ? initialValue : ""
                }

                let inputAttrs = `class="option-input" data-option="${optionName}_input" type="${inputType}" placeholder="${placeholder}"`
                if (inputType === "number") {
                    if (min !== null) inputAttrs += ` min="${min}"`
                    if (max !== null) inputAttrs += ` max="${max}"`
                    if (step !== null) inputAttrs += ` step="${step}"`
                }

                let toggleClass = toggleEnabled ? "toggle-switch active" : "toggle-switch"
                controlHTML = `
                    <div class="toggle-input-container" style="display: flex; align-items: center; gap: 10px;">
                        <div class="${toggleClass}" data-option="${optionName}_toggle"></div>
                        <input ${inputAttrs} value="${inputValue}">
                    </div>
                `
                this.state.options[optionName] = { enabled: toggleEnabled, value: inputValue }
                this.state.optionTypes[optionName] = "toggle-input"
            }

            optionItem.innerHTML = `
                <span class="option-label">${label}</span>
                ${controlHTML}
            `

            if (type === "toggle" && initialValue) {
                optionItem.querySelector(".toggle-switch").classList.add("active")
            } else if (type === "toggle-input") {
                let toggle = optionItem.querySelector(".toggle-switch")
                if (typeof initialValue === "object" && initialValue !== null && initialValue.enabled) {
                    toggle.classList.add("active")
                } else if (initialValue !== false && initialValue !== "") {
                    toggle.classList.add("active")
                }
            }

            if (sectionContainer) {
                sectionContainer.appendChild(optionItem)
            } else {
                this.noSectionOptions.appendChild(optionItem)
                if (!this.state.hasTabs) {
                    this.noSectionOptions.classList.add("active")
                } else if (this.state.activeTab !== null) {
                    this.noSectionOptions.classList.add("active")
                }
            }

            if (callback) {
                this.state.optionCallbacks[optionName] = callback
            }

            if (validator) {
                this.state.optionValidators[optionName] = validator
            }

            if (type === "toggle") {
                let toggle = optionItem.querySelector(".toggle-switch")
                this.attachToggleListener(toggle)
            } else if (type === "input") {
                let input = optionItem.querySelector(".option-input")
                this.attachInputListener(input)
            } else if (type === "toggle-input") {
                let toggle = optionItem.querySelector(".toggle-switch")
                let input = optionItem.querySelector(".option-input")
                this.attachToggleInputListener(optionName, toggle, input)
            }

            return optionItem
        }

        attachToggleListener(toggle) {
            toggle.addEventListener("click", (e) => {
                e.stopPropagation()
                toggle.classList.toggle("active")

                let optionName = toggle.dataset.option
                let newValue = toggle.classList.contains("active")
                this.state.options[optionName] = newValue

                this.triggerCallback(optionName, newValue)
            })
            toggle.addEventListener("touchend", (e) => {
                e.stopPropagation()
                e.preventDefault()
                toggle.classList.toggle("active")

                let optionName = toggle.dataset.option
                let newValue = toggle.classList.contains("active")
                this.state.options[optionName] = newValue

                this.triggerCallback(optionName, newValue)
            })
        }

        attachInputListener(input) {
            let originalValue = input.value
            let hasError = false

            input.addEventListener("focus", (e) => {
                originalValue = input.value
                if (hasError) {
                    input.classList.remove("error")
                    hasError = false
                }
                this.pauseGameEvents()
            })

            input.addEventListener("input", (e) => {
                e.stopPropagation()
                if (hasError) {
                    input.classList.remove("error")
                    hasError = false
                }

                let optionName = input.dataset.option
                let value = input.value

                if (input.type !== "number") {
                    this.state.options[optionName] = value
                    this.triggerCallback(optionName, value)
                }
            })

            input.addEventListener("blur", (e) => {
                let optionName = input.dataset.option
                let value = input.value

                if (input.type === "number") {
                    if (value === "" || isNaN(value)) {
                        input.classList.add("error")
                        input.value = originalValue
                        hasError = true
                        this.resumeGameEvents()
                        return
                    }
                    value = parseFloat(value)
                    if (input.min !== "" && value < parseFloat(input.min)) {
                        input.classList.add("error")
                        input.value = originalValue
                        hasError = true
                        this.resumeGameEvents()
                        return
                    }
                    if (input.max !== "" && value > parseFloat(input.max)) {
                        input.classList.add("error")
                        input.value = originalValue
                        hasError = true
                        this.resumeGameEvents()
                        return
                    }
                }

                if (this.state.optionValidators[optionName]) {
                    try {
                        let validationResult = this.state.optionValidators[optionName](value)
                        if (validationResult !== true) {
                            input.classList.add("error")
                            input.value = originalValue
                            hasError = true
                            this.resumeGameEvents()
                            return
                        }
                    } catch (e) {
                        input.classList.add("error")
                        input.value = originalValue
                        hasError = true
                        this.resumeGameEvents()
                        return
                    }
                }

                if (value !== originalValue) {
                    originalValue = value
                    this.state.options[optionName] = value
                    this.triggerCallback(optionName, value)
                }

                setTimeout(() => {
                    let activeElement = document.activeElement
                    if (!this.menu.contains(activeElement) || activeElement.tagName !== "INPUT") {
                        this.resumeGameEvents()
                    }
                }, 0)
            })

            input.addEventListener("keydown", (e) => {
                e.stopPropagation()
                if (e.key === "Enter") {
                    input.blur()
                }
            })
        }

        attachToggleInputListener(optionName, toggle, input) {
            let originalValue = input.value
            let hasError = false

            toggle.addEventListener("click", (e) => {
                e.stopPropagation()
                toggle.classList.toggle("active")
                let enabled = toggle.classList.contains("active")

                let currentValue = this.state.options[optionName] || { enabled: false, value: "" }
                if (typeof currentValue !== "object") {
                    currentValue = { enabled: false, value: currentValue }
                }
                currentValue.enabled = enabled
                this.state.options[optionName] = currentValue
                this.triggerCallback(optionName, currentValue)
            })
            toggle.addEventListener("touchend", (e) => {
                e.stopPropagation()
                e.preventDefault()
                toggle.classList.toggle("active")
                let enabled = toggle.classList.contains("active")

                let currentValue = this.state.options[optionName] || { enabled: false, value: "" }
                if (typeof currentValue !== "object") {
                    currentValue = { enabled: false, value: currentValue }
                }
                currentValue.enabled = enabled
                this.state.options[optionName] = currentValue
                this.triggerCallback(optionName, currentValue)
            })

            input.addEventListener("focus", (e) => {
                originalValue = input.value
                if (hasError) {
                    input.classList.remove("error")
                    hasError = false
                }
                this.pauseGameEvents()
            })

            input.addEventListener("input", (e) => {
                e.stopPropagation()
                if (hasError) {
                    input.classList.remove("error")
                    hasError = false
                }

                let value = input.value
                let currentValue = this.state.options[optionName] || { enabled: false, value: "" }
                if (typeof currentValue !== "object") {
                    currentValue = { enabled: false, value: currentValue }
                }

                if (currentValue.enabled && value !== currentValue.value) {
                    currentValue.value = value
                    this.state.options[optionName] = currentValue
                    this.triggerCallback(optionName, currentValue)
                }
            })

            input.addEventListener("blur", (e) => {
                let value = input.value

                if (input.type === "number") {
                    if (value === "" || isNaN(value)) {
                        input.classList.add("error")
                        input.value = originalValue
                        hasError = true
                        setTimeout(() => {
                            let activeElement = document.activeElement
                            if (!this.menu.contains(activeElement) || activeElement.tagName !== "INPUT") {
                                this.resumeGameEvents()
                            }
                        }, 0)
                        return
                    }
                    value = parseFloat(value)
                    if (input.min !== "" && value < parseFloat(input.min)) {
                        input.classList.add("error")
                        input.value = originalValue
                        hasError = true
                        setTimeout(() => {
                            let activeElement = document.activeElement
                            if (!this.menu.contains(activeElement) || activeElement.tagName !== "INPUT") {
                                this.resumeGameEvents()
                            }
                        }, 0)
                        return
                    }
                    if (input.max !== "" && value > parseFloat(input.max)) {
                        input.classList.add("error")
                        input.value = originalValue
                        hasError = true
                        setTimeout(() => {
                            let activeElement = document.activeElement
                            if (!this.menu.contains(activeElement) || activeElement.tagName !== "INPUT") {
                                this.resumeGameEvents()
                            }
                        }, 0)
                        return
                    }
                }

                if (this.state.optionValidators[optionName]) {
                    try {
                        let validationResult = this.state.optionValidators[optionName](value)
                        if (validationResult !== true) {
                            input.classList.add("error")
                            input.value = originalValue
                            hasError = true
                            setTimeout(() => {
                                let activeElement = document.activeElement
                                if (!this.menu.contains(activeElement) || activeElement.tagName !== "INPUT") {
                                    this.resumeGameEvents()
                                }
                            }, 0)
                            return
                        }
                    } catch (e) {
                        input.classList.add("error")
                        input.value = originalValue
                        hasError = true
                        setTimeout(() => {
                            let activeElement = document.activeElement
                            if (!this.menu.contains(activeElement) || activeElement.tagName !== "INPUT") {
                                this.resumeGameEvents()
                            }
                        }, 0)
                        return
                    }
                }

                if (value !== originalValue) {
                    originalValue = value
                    let currentValue = this.state.options[optionName] || { enabled: false, value: "" }
                    if (typeof currentValue !== "object") {
                        currentValue = { enabled: false, value: currentValue }
                    }
                    currentValue.value = value
                    this.state.options[optionName] = currentValue
                    this.triggerCallback(optionName, currentValue)
                }

                setTimeout(() => {
                    let activeElement = document.activeElement
                    if (!this.menu.contains(activeElement) || activeElement.tagName !== "INPUT") {
                        this.resumeGameEvents()
                    }
                }, 0)
            })

            input.addEventListener("keydown", (e) => {
                e.stopPropagation()
                if (e.key === "Enter") {
                    input.blur()
                }
            })
        }

        triggerCallback(optionName, value, skipSave = false) {
            if (this.state.optionCallbacks[optionName]) {
                try {
                    this.state.optionCallbacks[optionName](value, optionName)
                } catch (e) {
                }
            }

            if (!skipSave && !this.state.isAutoReapplying) {
                this.saveOptions()
            }

            if (!this.state.isAutoReapplying) {
                let event = new CustomEvent("overlayOptionChanged", {
                    detail: {
                        option: optionName,
                        value: value,
                        type: this.state.optionTypes[optionName]
                    }
                })
                window.dispatchEvent(event)
            }
        }

        saveOptions() {
            try {
                let optionsToSave = { ...this.state.options }
                if (optionsToSave.hasOwnProperty("github_section")) {
                    optionsToSave.github_section = false
                }
                localStorage.setItem("blocktanks_addons", JSON.stringify(optionsToSave))
            } catch (e) {
            }
        }

        getSavedOption(optionName) {
            try {
                let saved = localStorage.getItem("blocktanks_addons")
                if (saved) {
                    let savedOptions = JSON.parse(saved)
                    if (savedOptions.hasOwnProperty(optionName)) {
                        return savedOptions[optionName]
                    }
                }
            } catch (e) {
            }
            return null
        }

        loadOptions() {
            try {
                let saved = localStorage.getItem("blocktanks_addons")
                if (saved) {
                    let savedOptions = JSON.parse(saved)
                    Object.keys(savedOptions).forEach(optionName => {
                        if (optionName === "github_section") {
                            return
                        }
                        if (this.state.options.hasOwnProperty(optionName)) {
                            this.setOption(optionName, savedOptions[optionName])
                        }
                    })
                }
            } catch (e) {
            }
        }

        reapplyAllOptions() {
            try {
                let saved = localStorage.getItem("blocktanks_addons")
                if (saved) {
                    let savedOptions = JSON.parse(saved)
                    Object.keys(savedOptions).forEach(optionName => {
                        if (optionName === "github_section") {
                            return
                        }
                        if (this.state.options.hasOwnProperty(optionName)) {
                            let currentValue = this.state.options[optionName]
                            let savedValue = savedOptions[optionName]

                            if (JSON.stringify(currentValue) !== JSON.stringify(savedValue)) {
                                this.setOption(optionName, savedValue)
                            }
                        }
                    })
                }
            } catch (e) {
            }
        }

        triggerEnabledOptions() {
            Object.keys(this.state.options).forEach(optionName => {
                if (optionName === "github_section") {
                    return
                }
                let optionType = this.state.optionTypes[optionName]
                let value = this.state.options[optionName]

                if (optionType === "toggle") {
                    if (value === true) {
                        this.triggerCallback(optionName, value, true)
                    }
                } else if (optionType === "input") {
                    if (value !== null && value !== undefined && value !== "") {
                        this.triggerCallback(optionName, value, true)
                    }
                } else if (optionType === "toggle-input") {
                    if (typeof value === "object" && value !== null && value.enabled === true) {
                        this.triggerCallback(optionName, value, true)
                    } else if (value !== false && value !== "" && value !== null && value !== undefined) {
                        this.triggerCallback(optionName, value, true)
                    }
                }
            })
        }

        startAutoReapply() {
            if (this.state.autoReapplyInterval) {
                clearInterval(this.state.autoReapplyInterval)
            }
            this.state.autoReapplyInterval = setInterval(() => {
                this.state.isAutoReapplying = true
                try {
                    this.reapplyAllOptions()
                    this.triggerEnabledOptions()
                    if (this.state.options.hasOwnProperty("github_section")) {
                        this.setOption("github_section", false)
                    }
                } finally {
                    this.state.isAutoReapplying = false
                }
            }, 5000)
        }

        stopAutoReapply() {
            if (this.state.autoReapplyInterval) {
                clearInterval(this.state.autoReapplyInterval)
                this.state.autoReapplyInterval = null
            }
        }

        savePosition() {
            let position = {
                x: parseInt(this.menu.style.left) || this.config.defaultPosition.x,
                y: parseInt(this.menu.style.top) || this.config.defaultPosition.y
            }
            localStorage.setItem(`${this.config.menuId}_position`, JSON.stringify(position))
        }

        loadPosition() {
            let saved = localStorage.getItem(`${this.config.menuId}_position`)
            if (saved) {
                try {
                    let position = JSON.parse(saved)
                    this.menu.style.left = position.x + "px"
                    this.menu.style.top = position.y + "px"
                } catch (e) {
                }
            }
        }

        toggleCollapse() {
            this.state.isCollapsed = !this.state.isCollapsed
            if (this.state.isCollapsed) {
                this.state.expandedWidth = this.menu.style.width || this.menu.offsetWidth + "px"
                Object.values(this.sections).forEach(container => {
                    container.classList.remove("active")
                })
                Object.values(this.tabs).forEach(tab => {
                    tab.classList.remove("active")
                })
                this.state.activeTab = null
                this.menu.classList.add("collapsed")
                this.menu.style.width = "320px"
            } else {
                this.menu.classList.remove("collapsed")
                if (this.state.expandedWidth) {
                    this.menu.style.width = this.state.expandedWidth
                } else if (this.state.hasTabs) {
                    this.updateMenuWidth()
                } else {
                    this.menu.style.width = "320px"
                }

                if (this.state.hasTabs && Object.keys(this.sections).length > 0) {
                    let firstSection = Object.keys(this.sections)[0]
                    if (firstSection) {
                        this.switchTab(firstSection)
                    }
                }
            }
            this.saveCollapsedState()
        }

        saveCollapsedState() {
            localStorage.setItem(`${this.config.menuId}_collapsed`, JSON.stringify(this.state.isCollapsed))
        }

        loadCollapsedState() {
            let saved = localStorage.getItem(`${this.config.menuId}_collapsed`)
            if (saved) {
                try {
                    this.state.isCollapsed = JSON.parse(saved)
                    if (this.state.isCollapsed) {
                        this.menu.classList.add("collapsed")
                        this.menu.style.width = "320px"
                        Object.values(this.sections).forEach(container => {
                            container.classList.remove("active")
                        })
                        Object.values(this.tabs).forEach(tab => {
                            tab.classList.remove("active")
                        })
                        this.state.activeTab = null
                    }
                } catch (e) {
                }
            }
        }

        getOption(name) {
            return this.state.options[name] !== undefined ? this.state.options[name] : null
        }

        setOption(name, value) {
            let optionType = this.state.optionTypes[name]
            let currentValue = this.state.options[name]

            let valueChanged = JSON.stringify(currentValue) !== JSON.stringify(value)

            if (!valueChanged) {
                return
            }

            if (optionType === "toggle") {
                let control = this.menu.querySelector(`[data-option="${name}"]`)
                if (!control) return

                if (value) {
                    control.classList.add("active")
                } else {
                    control.classList.remove("active")
                }
                this.state.options[name] = value
            } else if (optionType === "input") {
                let control = this.menu.querySelector(`[data-option="${name}"]`)
                if (!control) return

                control.value = value
                this.state.options[name] = value
            } else if (optionType === "toggle-input") {
                let toggle = this.menu.querySelector(`[data-option="${name}_toggle"]`)
                let input = this.menu.querySelector(`[data-option="${name}_input"]`)
                if (!toggle || !input) return

                let toggleValue = false
                let inputValue = ""

                if (typeof value === "object" && value !== null) {
                    toggleValue = value.enabled === true
                    inputValue = value.value !== undefined ? value.value : ""
                } else {
                    toggleValue = value !== false && value !== ""
                    inputValue = typeof value === "string" || typeof value === "number" ? value : ""
                }

                if (toggleValue) {
                    toggle.classList.add("active")
                } else {
                    toggle.classList.remove("active")
                }
                input.value = inputValue
                this.state.options[name] = { enabled: toggleValue, value: inputValue }
            } else {
                return
            }

            if (!this.state.isAutoReapplying) {
                this.triggerCallback(name, this.state.options[name], false)
            }
        }

        onOptionChange(optionName, callback) {
            this.state.optionCallbacks[optionName] = callback
        }

        setValidator(optionName, validator) {
            this.state.optionValidators[optionName] = validator
        }

        getAllOptions() {
            return { ...this.state.options }
        }

        show() {
            this.menu.style.display = "block"
        }

        hide() {
            this.menu.style.display = "none"
        }

        toggle() {
            this.menu.style.display = this.menu.style.display === "none" ? "block" : "none"
        }

        collapse() {
            if (!this.state.isCollapsed) this.toggleCollapse()
        }

        expand() {
            if (this.state.isCollapsed) this.toggleCollapse()
        }

        hasSection(sectionName) {
            return this.sections.hasOwnProperty(sectionName)
        }

        getAllSections() {
            return Object.keys(this.sections)
        }

        getActiveTab() {
            return this.state.activeTab
        }

        addSections(sectionNames) {
            sectionNames.forEach(name => this.addSection(name))
        }
    }

    window.OverlayMenu = new OverlayMenu()

    function createBlocktanksAddons() {
        let overlayMenu = window.OverlayMenu
        overlayMenu.addSections(["Visuals", "Filters", "Gameplay", "GitHub"])

        overlayMenu.addOption("custom_crosshair", "Custom Crosshair", {
            section: "Visuals",
            type: "input",
            inputType: "text",
            placeholder: "Cursor URL",
            callback: (value) => {
                if (value) {
                    let img = new Image()
                    img.crossOrigin = "anonymous"
                    img.onload = () => {
                        let canvas = document.createElement("canvas")
                        let ctx = canvas.getContext("2d")
                        let size = 32

                        canvas.width = size
                        canvas.height = size

                        ctx.drawImage(img, 0, 0, size, size)

                        let dataUrl = canvas.toDataURL("image/png")
                        document.body.style.cursor = `url("${dataUrl}"), crosshair`
                        document.documentElement.style.cursor = `url("${dataUrl}"), crosshair`
                    }
                    img.onerror = () => {
                        document.body.style.cursor = ""
                        document.documentElement.style.cursor = ""
                    }
                    img.src = value
                } else {
                    document.body.style.cursor = ""
                    document.documentElement.style.cursor = ""
                }
            }
        })

        overlayMenu.addOption("custom_bullet", "Custom Bullet", {
            section: "Visuals",
            type: "input",
            inputType: "text",
            placeholder: "Bullet URL",
            callback: (value) => {
                if (value) {
                    let img = new Image()
                    img.crossOrigin = "anonymous"
                    img.onload = () => {
                        let canvas = document.createElement("canvas")
                        let ctx = canvas.getContext("2d")
                        let size = 11

                        canvas.width = size
                        canvas.height = size

                        ctx.drawImage(img, 0, 0, size, size)

                        let dataUrl = canvas.toDataURL("image/png")

                        game.load.image("bullet", dataUrl)
                        game.load.image("bullet_dark", dataUrl)
                        game.load.start()

                    }
                    img.onerror = () => {
                        game.load.image("bullet", "assets/" + "bullet.png")
                        game.load.image("bullet_dark", "assets/darkMode/" + "bullet.png")
                    }
                    img.src = value
                } else {
                    game.load.image("bullet", "assets/" + "bullet.png")
                    game.load.image("bullet_dark", "assets/darkMode/" + "bullet.png")
                }
            }
        })

        overlayMenu.addOption("bw_filter", "Black and White Filter", {
            section: "Filters",
            type: "toggle",
            defaultValue: false,
            callback: (value) => {
                let overlay = document.getElementById("blocktans_addons_bw_filter_overlay")
                if (value === true) {
                    if (!overlay) {
                        overlay = document.createElement("div")
                        overlay.id = "blocktans_addons_bw_filter_overlay"
                        overlay.style.position = "fixed"
                        overlay.style.top = "0"
                        overlay.style.left = "0"
                        overlay.style.width = "100vw"
                        overlay.style.height = "100vh"
                        overlay.style.pointerEvents = "none"
                        overlay.style.zIndex = "9999"
                        overlay.style.backdropFilter = "grayscale(100%)"
                        document.body.appendChild(overlay)
                    }
                    else {
                        overlay.style.backdropFilter = "grayscale(100%)"
                    }
                }
                else {
                    if (overlay) {
                        overlay.remove()
                    }
                }
            }
        })

        overlayMenu.addOption("sepia_filter", "Sepia Filter", {
            section: "Filters",
            type: "toggle",
            defaultValue: false,
            callback: (value) => {
                let overlay = document.getElementById("blocktans_addons_sepia_filter_overlay")
                if (value === true) {
                    if (!overlay) {
                        overlay = document.createElement("div")
                        overlay.id = "blocktans_addons_sepia_filter_overlay"
                        overlay.style.position = "fixed"
                        overlay.style.top = "0"
                        overlay.style.left = "0"
                        overlay.style.width = "100vw"
                        overlay.style.height = "100vh"
                        overlay.style.pointerEvents = "none"
                        overlay.style.zIndex = "9999"
                        overlay.style.backdropFilter = "sepia(100%)"
                        document.body.appendChild(overlay)
                    }
                    else {
                        overlay.style.backdropFilter = "sepia(100%)"
                    }
                }
                else {
                    if (overlay) {
                        overlay.remove()
                    }
                }
            }
        })

        overlayMenu.addOption("invert_filter", "Invert Filter", {
            section: "Filters",
            type: "toggle",
            defaultValue: false,
            callback: (value) => {
                let overlay = document.getElementById("blocktans_addons_invert_filter_overlay")
                if (value === true) {
                    if (!overlay) {
                        overlay = document.createElement("div")
                        overlay.id = "blocktans_addons_invert_filter_overlay"
                        overlay.style.position = "fixed"
                        overlay.style.top = "0"
                        overlay.style.left = "0"
                        overlay.style.width = "100vw"
                        overlay.style.height = "100vh"
                        overlay.style.pointerEvents = "none"
                        overlay.style.zIndex = "9999"
                        overlay.style.backdropFilter = "invert(100%)"
                        document.body.appendChild(overlay)
                    }
                    else {
                        overlay.style.backdropFilter = "invert(100%)"
                    }
                }
                else {
                    if (overlay) {
                        overlay.remove()
                    }
                }
            }
        })

        overlayMenu.addOption("saturate_filter", "Saturate Filter", {
            section: "Filters",
            type: "toggle",
            defaultValue: false,
            callback: (value) => {
                let overlay = document.getElementById("blocktans_addons_saturate_filter_overlay")
                if (value === true) {
                    if (!overlay) {
                        overlay = document.createElement("div")
                        overlay.id = "blocktans_addons_saturate_filter_overlay"
                        overlay.style.position = "fixed"
                        overlay.style.top = "0"
                        overlay.style.left = "0"
                        overlay.style.width = "100vw"
                        overlay.style.height = "100vh"
                        overlay.style.pointerEvents = "none"
                        overlay.style.zIndex = "9999"
                        overlay.style.backdropFilter = "saturate(150%)"
                        document.body.appendChild(overlay)
                    }
                    else {
                        overlay.style.backdropFilter = "saturate(150%)"
                    }
                }
                else {
                    if (overlay) {
                        overlay.remove()
                    }
                }
            }
        })

        overlayMenu.addOption("hue_filter", "Hue Filter", {
            section: "Filters",
            type: "toggle-input",
            inputType: "number",
            placeholder: "Degrees (0-360)",
            defaultValue: { enabled: true, value: "0" },
            min: 0,
            max: 360,
            step: 1,
            callback: (value) => {
                let overlay = document.getElementById("blocktans_addons_hue_filter_overlay")

                if (value.enabled === true && value.value !== "" && value.value !== null) {
                    let hueValue = parseFloat(value.value) || 0
                    hueValue = Math.max(0, Math.min(360, hueValue))

                    if (!overlay) {
                        overlay = document.createElement("div")
                        overlay.id = "blocktans_addons_hue_filter_overlay"
                        overlay.style.position = "fixed"
                        overlay.style.top = "0"
                        overlay.style.left = "0"
                        overlay.style.width = "100vw"
                        overlay.style.height = "100vh"
                        overlay.style.pointerEvents = "none"
                        overlay.style.zIndex = "9999"
                        document.body.appendChild(overlay)
                    }
                    overlay.style.backdropFilter = `hue-rotate(${hueValue}deg)`
                }
                else {
                    if (overlay) {
                        overlay.remove()
                    }
                }
            }
        })

        overlayMenu.addOption("toggle_minimap", "Toggle Minimap", {
            section: "Gameplay",
            type: "toggle",
            defaultValue: false,
            callback: (value) => {
                minimap.setVisible(value)
            }
        })

        overlayMenu.addOption("github_section", "BlockTanks Addons are developed by Luvanaris. Toggle this button to visit the repository.", {
            section: "GitHub",
            type: "toggle",
            defaultValue: false,
            callback: (value) => {
                if (value === true) {
                    window.open("https://github.com/Luvanaris/blocktanks_addons", "_blank")
                    overlayMenu.setOption("github_section", false)
                }
            }
        })

        overlayMenu.setOption("github_section", false)

        overlayMenu.reapplyAllOptions()
        overlayMenu.triggerEnabledOptions()
    }

    createBlocktanksAddons()
})()
