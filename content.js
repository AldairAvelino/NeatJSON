/**
 * NeatJSON
 * @version 1.0.0
 * @author Aldair Avelino
 * @license MIT
*/

;(() => {
  let globalLineCount = 0
  let isEntirelyCollapsed = false
  let lineNumbersContainer = null
  let jsonContentContainer = null
  let mutationObserver = null
  let updateTimeout = null
  let scrollTimeout = null

  // Função para carregar FontAwesome se não estiver disponível
  function ensureFontAwesome() {
    // Verifica se FontAwesome já está carregado
    if (!document.querySelector('link[href*="font-awesome"]')) {
      const fontAwesomeLink = document.createElement('link')
      fontAwesomeLink.rel = 'stylesheet'
      fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
      fontAwesomeLink.crossOrigin = 'anonymous'
      document.head.appendChild(fontAwesomeLink)
    }
  }

  // Verifica se o conteúdo é JSON válido
  function isJsonContent() {
    const contentType = window.document.contentType || ""
    const bodyText = window.document.body ? window.document.body.textContent.trim() : ""

    // Verifica content-type ou tenta fazer parse do conteúdo
    if (contentType.includes("application/json") || contentType.includes("text/json")) {
      return true
    }

    // Tenta detectar JSON pelo conteúdo
    if (bodyText.startsWith("{") || bodyText.startsWith("[")) {
      try {
        JSON.parse(bodyText)
        return true
      } catch (e) {
        return false
      }
    }

    return false
  }

  // Carrega configurações salvas
  async function loadSettings() {
    return new Promise((resolve) => {
      window.chrome.storage.sync.get(
        {
          theme: "light",
          indentation: 2,
          font: "Inter",
        },
        resolve,
      )
    })
  }

  // Aplica tema baseado nas configurações
  function applyTheme(theme) {
    window.document.documentElement.setAttribute("data-theme", theme)
  }

  // Debounce function para performance
  function debounce(func, wait) {
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(updateTimeout)
        func(...args)
      }
      clearTimeout(updateTimeout)
      updateTimeout = setTimeout(later, wait)
    }
  }

  // Função principal para atualizar numeração com debounce
  const debouncedUpdateLineNumbers = debounce(() => {
    if (jsonContentContainer && lineNumbersContainer) {
      updateLineNumbers(jsonContentContainer, lineNumbersContainer)
    }
  }, 100)

  // Cria estrutura do visualizador JSON
  function createJsonViewer(jsonData, settings) {
    const container = window.document.createElement("div")
    container.className = "json-viewer-container"

    // Container do JSON com numeração e controles inline
    const jsonContainer = window.document.createElement("div")
    jsonContainer.className = "json-content-wrapper"

    const lineNumbers = window.document.createElement("div")
    lineNumbers.className = "line-numbers"

    const jsonContent = window.document.createElement("div")
    jsonContent.className = "json-content"

    // Armazena referências globais
    lineNumbersContainer = lineNumbers
    jsonContentContainer = jsonContent

    // Renderiza o JSON
    globalLineCount = 0
    const jsonElement = renderJsonElement(jsonData, "", settings.indentation)
    jsonContent.appendChild(jsonElement)

    // Cria controles inline sticky
    const stickyControls = createStickyControls(jsonData, jsonContainer)

    jsonContainer.appendChild(lineNumbers)
    jsonContainer.appendChild(jsonContent)

    container.appendChild(stickyControls)
    container.appendChild(jsonContainer)

    // Configura MutationObserver e scroll listener
    setupObservers(jsonContent)

    return container
  }

  // Cria controles sticky no topo
  function createStickyControls(jsonData, jsonContainer) {
    const stickyContainer = window.document.createElement("div")
    stickyContainer.className = "sticky-controls"

    // Container de busca expansível
    const searchContainer = window.document.createElement("div")
    searchContainer.className = "search-container"

    const searchIcon = window.document.createElement("button")
    searchIcon.className = "control-btn search-btn"
    // Usando Unicode como fallback se FontAwesome não carregar
    searchIcon.innerHTML = '<i class="fa fa-search" aria-hidden="true"></i>'
    searchIcon.title = "Buscar no JSON"

    const searchInput = window.document.createElement("input")
    searchInput.type = "text"
    searchInput.placeholder = "Buscar chaves ou valores..."
    searchInput.className = "search-input collapsed"

    searchContainer.appendChild(searchInput)
    searchContainer.appendChild(searchIcon)

    // Botão copiar
    const copyBtn = window.document.createElement("button")
    copyBtn.className = "control-btn copy-btn"
    copyBtn.innerHTML = '<i class="fa fa-copy" aria-hidden="true"></i>'
    copyBtn.title = "Copiar JSON"

    // Botão expandir/colapsar tudo
    const toggleBtn = window.document.createElement("button")
    toggleBtn.className = "control-btn toggle-btn"
    toggleBtn.innerHTML = '<i class="fa fa-compress-arrows-alt" aria-hidden="true"></i>'
    toggleBtn.title = "Colapsar Tudo"
    let isExpanded = true

    stickyContainer.appendChild(searchContainer)
    stickyContainer.appendChild(copyBtn)
    stickyContainer.appendChild(toggleBtn)

    // Event listeners
    searchIcon.addEventListener("click", () => {
      searchInput.classList.toggle("collapsed")
      searchIcon.classList.toggle("active")
      if (!searchInput.classList.contains("collapsed")) {
        searchInput.focus()
      } else {
        searchInput.value = ""
        highlightSearch("", jsonContainer)
      }
    })

    searchInput.addEventListener("input", (e) => {
      highlightSearch(e.target.value, jsonContainer)
    })

    searchInput.addEventListener("blur", () => {
      if (!searchInput.value.trim()) {
        setTimeout(() => {
          searchInput.classList.add("collapsed")
          searchIcon.classList.remove("active")
        }, 200)
      }
    })

    copyBtn.addEventListener("click", () => copyToClipboard(jsonData, copyBtn))

    toggleBtn.addEventListener("click", () => {
      toggleAllNodes(jsonContainer, isExpanded)
      isExpanded = !isExpanded
      toggleBtn.innerHTML = isExpanded 
        ? '<i class="fas fa-compress-arrows-alt" aria-hidden="true"></i><span class="icon-fallback">⬇️</span>' 
        : '<i class="fas fa-expand-arrows-alt" aria-hidden="true"></i><span class="icon-fallback">⬆️</span>'
      toggleBtn.title = isExpanded ? "Colapsar Tudo" : "Expandir Tudo"
      toggleBtn.classList.toggle("expanded", !isExpanded)

      isEntirelyCollapsed = !isExpanded

      // Força atualização da numeração
      setTimeout(() => {
        updateLineNumbers(jsonContentContainer, lineNumbersContainer)
      }, 150)
    })

    return stickyContainer
  }

  // Configura observadores
  function setupObservers(jsonContent) {
    // MutationObserver
    if (mutationObserver) {
      mutationObserver.disconnect()
    }

    mutationObserver = new MutationObserver((mutations) => {
      let shouldUpdate = false
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          shouldUpdate = true
        }
        if (mutation.type === 'childList') {
          shouldUpdate = true
        }
      })

      if (shouldUpdate) {
        debouncedUpdateLineNumbers()
      }
    })

    mutationObserver.observe(jsonContent, {
      attributes: true,
      attributeFilter: ['style'],
      childList: true,
      subtree: true
    })

    // Scroll listener para atualizar numeração durante scroll
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        debouncedUpdateLineNumbers()
      }, 100)
    })
  }

  // Renderiza elemento JSON recursivamente
  function renderJsonElement(data, key = "", indent = 2, level = 0) {
    const element = window.document.createElement("div")
    element.className = "json-element"
    element.style.marginLeft = `${level * indent}em`
    element.setAttribute("data-line", ++globalLineCount)
    element.setAttribute("data-level", level)
    element.setAttribute("data-visible", "true")

    if (data === null) {
      element.innerHTML = `${key ? `<span class="json-key">"${key}"</span>: ` : ""}<span class="json-null">null</span>`
    } else if (typeof data === "boolean") {
      element.innerHTML = `${key ? `<span class="json-key">"${key}"</span>: ` : ""}<span class="json-boolean">${data}</span>`
    } else if (typeof data === "number") {
      element.innerHTML = `${key ? `<span class="json-key">"${key}"</span>: ` : ""}<span class="json-number">${data}</span>`
    } else if (typeof data === "string") {
      element.innerHTML = `${key ? `<span class="json-key">"${key}"</span>: ` : ""}<span class="json-string">"${escapeHtml(data)}"</span>`
    } else if (Array.isArray(data)) {
      const isCollapsible = data.length > 0
      
      const lineContent = window.document.createElement("span")
      lineContent.className = "json-line-content"

      const toggleIcon = window.document.createElement("span")
      toggleIcon.className = "toggle-icon"
      toggleIcon.innerHTML = isCollapsible ? '<i class="fas fa-chevron-down" aria-hidden="true"></i><span class="icon-fallback">▼</span>' : ""

      const keySpan = window.document.createElement("span")
      if (key) {
        keySpan.innerHTML = `<span class="json-key">"${key}"</span>: `
      }

      const bracket = window.document.createElement("span")
      bracket.className = "json-bracket"
      bracket.textContent = `[${data.length === 0 ? "]" : ""}`

      lineContent.appendChild(toggleIcon)
      lineContent.appendChild(keySpan)
      lineContent.appendChild(bracket)
      element.appendChild(lineContent)

      if (data.length > 0) {
        const childrenContainer = window.document.createElement("div")
        childrenContainer.className = "json-children"

        data.forEach((item, index) => {
          const child = renderJsonElement(item, "", indent, level + 1)
          childrenContainer.appendChild(child)
        })

        const closingBracket = window.document.createElement("div")
        closingBracket.className = "json-element"
        closingBracket.style.marginLeft = `${level * indent}em`
        closingBracket.setAttribute("data-line", ++globalLineCount)
        closingBracket.setAttribute("data-level", level)
        closingBracket.setAttribute("data-visible", "true")

        const isLastElement = level === 0
        closingBracket.innerHTML = `<span class="json-bracket">]</span>${!isLastElement ? '<span class="json-comma">,</span>' : ""}`

        childrenContainer.appendChild(closingBracket)
        element.appendChild(childrenContainer)

        // Toggle functionality
        if (isCollapsible) {
          lineContent.style.cursor = "pointer"
          lineContent.addEventListener("click", () => {
            const isVisible = childrenContainer.style.display !== "none"
            childrenContainer.style.display = isVisible ? "none" : "block"
            toggleIcon.innerHTML = isVisible 
              ? '<i class="fas fa-chevron-right" aria-hidden="true"></i><span class="icon-fallback">▶</span>' 
              : '<i class="fas fa-chevron-down" aria-hidden="true"></i><span class="icon-fallback">▼</span>'
            bracket.textContent = isVisible ? "[...]" : "["

            isEntirelyCollapsed = false
            setTimeout(() => {
              updateLineNumbers(jsonContentContainer, lineNumbersContainer)
            }, 50)
          })
        }
      }
    } else if (typeof data === "object") {
      const keys = Object.keys(data)
      const isCollapsible = keys.length > 0

      const lineContent = window.document.createElement("span")
      lineContent.className = "json-line-content"

      const toggleIcon = window.document.createElement("span")
      toggleIcon.className = "toggle-icon"
      toggleIcon.innerHTML = isCollapsible ? '<i class="fas fa-chevron-down" aria-hidden="true"></i><span class="icon-fallback">▼</span>' : ""

      const keySpan = window.document.createElement("span")
      if (key) {
        keySpan.innerHTML = `<span class="json-key">"${key}"</span>: `
      }

      const brace = window.document.createElement("span")
      brace.className = "json-bracket"
      brace.textContent = `{${keys.length === 0 ? "}" : ""}`

      lineContent.appendChild(toggleIcon)
      lineContent.appendChild(keySpan)
      lineContent.appendChild(brace)
      element.appendChild(lineContent)

      if (keys.length > 0) {
        const childrenContainer = window.document.createElement("div")
        childrenContainer.className = "json-children"

        keys.forEach((objKey, index) => {
          const child = renderJsonElement(data[objKey], objKey, indent, level + 1)
          if (index < keys.length - 1) {
            const lastElement = child.lastElementChild || child
            lastElement.innerHTML += '<span class="json-comma">,</span>'
          }
          childrenContainer.appendChild(child)
        })

        const closingBrace = window.document.createElement("div")
        closingBrace.className = "json-element"
        closingBrace.style.marginLeft = `${level * indent}em`
        closingBrace.setAttribute("data-line", ++globalLineCount)
        closingBrace.setAttribute("data-level", level)
        closingBrace.setAttribute("data-visible", "true")

        const isLastElement = level === 0
        closingBrace.innerHTML = `<span class="json-bracket">}</span>${!isLastElement ? '<span class="json-comma">,</span>' : ""}`

        childrenContainer.appendChild(closingBrace)
        element.appendChild(childrenContainer)

        // Toggle functionality
        if (isCollapsible) {
          lineContent.style.cursor = "pointer"
          lineContent.addEventListener("click", () => {
            const isVisible = childrenContainer.style.display !== "none"
            childrenContainer.style.display = isVisible ? "none" : "block"
            toggleIcon.innerHTML = isVisible 
              ? '<i class="fas fa-chevron-right" aria-hidden="true"></i><span class="icon-fallback">▶</span>' 
              : '<i class="fas fa-chevron-down" aria-hidden="true"></i><span class="icon-fallback">▼</span>'
            brace.textContent = isVisible ? "{...}" : "{"

            isEntirelyCollapsed = false
            setTimeout(() => {
              updateLineNumbers(jsonContentContainer, lineNumbersContainer)
            }, 50)
          })
        }
      }
    }

    return element
  }

  // Função segura para escapar HTML
  function escapeHtml(text) {
    const div = window.document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }

  // Copia JSON para clipboard com animação
  async function copyToClipboard(data, button) {
    try {
      const jsonString = JSON.stringify(data, null, 2)
      await window.navigator.clipboard.writeText(jsonString)

      button.classList.add("success")
      button.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i><span class="icon-fallback">✅</span>'

      setTimeout(() => {
        button.classList.remove("success")
        button.innerHTML = '<i class="fas fa-copy" aria-hidden="true"></i><span class="icon-fallback">📋</span>'
      }, 2000)
    } catch (err) {
      console.error("Erro ao copiar:", err)

      button.classList.add("error")
      button.innerHTML = '<i class="fas fa-times" aria-hidden="true"></i><span class="icon-fallback">❌</span>'

      setTimeout(() => {
        button.classList.remove("error")
        button.innerHTML = '<i class="fas fa-copy" aria-hidden="true"></i><span class="icon-fallback">📋</span>'
      }, 2000)
    }
  }

  // Destaca termos de busca
  function highlightSearch(searchTerm, container) {
    const highlighted = container.querySelectorAll(".search-highlight")
    highlighted.forEach((el) => {
      const parent = el.parentNode
      parent.replaceChild(window.document.createTextNode(el.textContent), el)
      parent.normalize()
    })

    if (!searchTerm.trim()) return

    const walker = window.document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false)

    const textNodes = []
    let node
    while ((node = walker.nextNode())) {
      textNodes.push(node)
    }

    textNodes.forEach((textNode) => {
      const text = textNode.textContent
      const regex = new RegExp(`(${escapeRegex(searchTerm)})`, "gi")

      if (regex.test(text)) {
        const highlightedText = text.replace(regex, '<mark class="search-highlight">$1</mark>')
        const wrapper = window.document.createElement("span")
        wrapper.innerHTML = highlightedText
        textNode.parentNode.replaceChild(wrapper, textNode)
      }
    })
  }

  // Escapa caracteres especiais para regex
  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  }

  // Expande/colapsa todos os nós
  function toggleAllNodes(container, shouldCollapse) {
    const toggleIcons = container.querySelectorAll(".toggle-icon")
    toggleIcons.forEach((icon) => {
      const clickableParent = icon.closest('.json-line-content');
      if (clickableParent && clickableParent.style.cursor === "pointer") {
        const childrenContainer = clickableParent.parentElement.querySelector(".json-children")
        if (childrenContainer) {
          childrenContainer.style.display = shouldCollapse ? "none" : "block"
          icon.innerHTML = shouldCollapse 
            ? '<i class="fas fa-chevron-right" aria-hidden="true"></i><span class="icon-fallback">▶</span>' 
            : '<i class="fas fa-chevron-down" aria-hidden="true"></i><span class="icon-fallback">▼</span>'

          const bracket = clickableParent.querySelector(".json-bracket")
          if (bracket) {
            const isArray = bracket.textContent.includes("[")
            bracket.textContent = shouldCollapse ? (isArray ? "[...]" : "{...}") : isArray ? "[" : "{"
          }
        }
      }
    })
  }

  // Atualiza numeração de linhas
  function updateLineNumbers(jsonContent, lineNumbersContainer) {
    if (!jsonContent || !lineNumbersContainer) {
      return
    }

    lineNumbersContainer.innerHTML = ""

    if (isEntirelyCollapsed) {
      const firstLine = window.document.createElement("div")
      firstLine.className = "line-number"
      firstLine.textContent = "1"
      lineNumbersContainer.appendChild(firstLine)

      if (globalLineCount > 1) {
        const hiddenIndicator = window.document.createElement("div")
        hiddenIndicator.className = "line-number hidden-lines"
        hiddenIndicator.textContent = "⋮"
        lineNumbersContainer.appendChild(hiddenIndicator)

        const lastLine = window.document.createElement("div")
        lastLine.className = "line-number"
        lastLine.textContent = globalLineCount
        lineNumbersContainer.appendChild(lastLine)
      }
      return
    }

    const allElements = jsonContent.querySelectorAll('.json-element')
    let visibleCount = 0

    allElements.forEach((element) => {
      const isVisible = isElementTrulyVisible(element)
      
      if (isVisible) {
        visibleCount++
        const lineDiv = window.document.createElement("div")
        lineDiv.className = "line-number"
        lineDiv.textContent = visibleCount.toString()
        lineNumbersContainer.appendChild(lineDiv)
      }
    })

    console.log(`JSON Viewer Pro: Numeração atualizada - ${visibleCount} linhas visíveis de ${allElements.length} elementos totais`)
  }

  // Verifica se elemento está realmente visível
  function isElementTrulyVisible(element) {
    if (!element || !element.offsetParent && element !== window.document.body) {
      if (element && element.style.display !== 'none') {
        let parent = element.parentElement
        while (parent && parent !== window.document.body) {
          if (parent.style.display === 'none' || 
              window.getComputedStyle(parent).display === 'none') {
            return false
          }
          parent = parent.parentElement
        }
        return true
      }
      return false
    }

    const computedStyle = window.getComputedStyle(element)
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
      return false
    }

    let parent = element.parentElement
    while (parent && parent !== window.document.body) {
      const parentStyle = window.getComputedStyle(parent)
      if (parentStyle.display === 'none' || parent.style.display === 'none') {
        return false
      }
      parent = parent.parentElement
    }

    return true
  }

  // Inicialização principal
  async function init() {
    if (!isJsonContent()) return

    try {
      // Garante que FontAwesome seja carregado
      ensureFontAwesome()

      const jsonText = window.document.body.textContent.trim()
      const jsonData = JSON.parse(jsonText)

      const settings = await loadSettings()

      applyTheme(settings.theme)

      window.document.documentElement.style.setProperty(
        "--font-family",
        settings.font === "Roboto Mono" ? '"Roboto Mono", monospace' : '"Inter", sans-serif',
      )

      window.document.body.innerHTML = ""
      const viewer = createJsonViewer(jsonData, settings)
      window.document.body.appendChild(viewer)

      isEntirelyCollapsed = false
      
      setTimeout(() => updateLineNumbers(jsonContentContainer, lineNumbersContainer), 100)
      setTimeout(() => updateLineNumbers(jsonContentContainer, lineNumbersContainer), 300)
      setTimeout(() => updateLineNumbers(jsonContentContainer, lineNumbersContainer), 500)

      window.document.body.classList.add("json-viewer-active")
    } catch (error) {
      console.error("Erro ao processar JSON:", error)
    }
  }

  // Cleanup
  window.addEventListener('beforeunload', () => {
    if (mutationObserver) {
      mutationObserver.disconnect()
    }
    if (updateTimeout) {
      clearTimeout(updateTimeout)
    }
    if (scrollTimeout) {
      clearTimeout(scrollTimeout)
    }
  })

  if (window.document.readyState === "loading") {
    window.document.addEventListener("DOMContentLoaded", init)
  } else {
    init()
  }
})()
