/**
 * NeatJSON
 * @version 1.0.0
 * @author Aldair Avelino
 * @license MIT
*/

;(() => {
  // Elementos do DOM
  const themeSelect = document.getElementById("theme-select")
  const fontSelect = document.getElementById("font-select")
  const indentRadios = document.querySelectorAll('input[name="indent"]')
  const saveBtn = document.getElementById("save-btn")
  const resetBtn = document.getElementById("reset-btn")
  const themePreview = document.getElementById("theme-preview")
  const jsonCount = document.getElementById("json-count")
  const timeSaved = document.getElementById("time-saved")

  // Variável para armazenar as configurações atuais (não salvas)
  let currentSettings = {
    theme: "light",
    font: "Inter",
    indentation: 2,
    jsonProcessed: 0,
    timeSaved: 0,
  }

  // Carrega configurações salvas
  function loadSettings() {
    window.chrome.storage.sync.get(
      {
        theme: "light",
        font: "Inter",
        indentation: 2,
        jsonProcessed: 0,
        timeSaved: 0,
      },
      (settings) => {
        // Atualiza as configurações atuais com as salvas
        currentSettings = { ...settings }

        // Aplica valores aos controles
        themeSelect.value = currentSettings.theme
        fontSelect.value = currentSettings.font
        
        // Seleciona radio button correto
        indentRadios.forEach(radio => {
          if (parseInt(radio.value) === currentSettings.indentation) {
            radio.checked = true
          }
        })

        // Atualiza estatísticas
        jsonCount.textContent = currentSettings.jsonProcessed || 0
        timeSaved.textContent = `${currentSettings.timeSaved || 0}min`

        // Atualiza preview com o tema carregado
        updatePreview(currentSettings.theme)
      },
    )
  }

  // Atualiza preview do tema
  function updatePreview(theme) {
    // Remove classes anteriores
    themePreview.className = "theme-preview"

    // Adiciona a nova classe do tema (agora sempre adiciona)
    themePreview.classList.add(theme)

    // Animação suave
    themePreview.style.transform = "scale(0.95)"
    setTimeout(() => {
      themePreview.style.transform = "scale(1)"
    }, 150)
  }

  // Obtém valor da indentação selecionada
  function getSelectedIndentation() {
    const selected = document.querySelector('input[name="indent"]:checked')
    return selected ? parseInt(selected.value) : 2
  }

  // Salva configurações
  function saveSettings() {
    // Atualiza as configurações atuais com os valores dos controles
    currentSettings.theme = themeSelect.value
    currentSettings.font = fontSelect.value
    currentSettings.indentation = getSelectedIndentation()

    // Validação de entrada - medida de segurança
    const validThemes = ["light", "dark", "high-contrast", "catppuccin", "dracula", "noctis", "omni", "onedark"]
    const validFonts = ["Inter", "Roboto Mono"]
    const validIndentations = [2, 4, 8]

    if (
      !validThemes.includes(currentSettings.theme) ||
      !validFonts.includes(currentSettings.font) ||
      !validIndentations.includes(currentSettings.indentation)
    ) {
      console.error("Configurações inválidas detectadas")
      return
    }

    // Salva no storage do Chrome
    window.chrome.storage.sync.set(currentSettings, () => {
      // Feedback visual
      saveBtn.classList.add("success")
      saveBtn.innerHTML = '<i class="fas fa-check"></i> Salvo!'

      setTimeout(() => {
        saveBtn.classList.remove("success")
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Salvar'
      }, 2000)

      // Recarrega abas com JSON ativo
      reloadJsonTabs()
    })
  }

  // Reseta configurações para padrão
  function resetSettings() {
    const defaultSettings = {
      theme: "light",
      font: "Inter",
      indentation: 2,
      jsonProcessed: currentSettings.jsonProcessed, // Mantém as estatísticas
      timeSaved: currentSettings.timeSaved, // Mantém as estatísticas
    }

    window.chrome.storage.sync.set(defaultSettings, () => {
      // Recarrega a interface com as configurações padrão
      loadSettings()
      
      // Feedback visual
      resetBtn.innerHTML = '<i class="fas fa-check"></i> Resetado!'
      setTimeout(() => {
        resetBtn.innerHTML = '<i class="fas fa-undo"></i> Resetar'
      }, 1500)

      // Recarrega abas
      reloadJsonTabs()
    })
  }

  // Recarrega abas que estão exibindo JSON
  function reloadJsonTabs() {
    window.chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        // Verifica se a aba tem permissão para executar scripts e se é uma aba HTTP/HTTPS
        if (tab.url && (tab.url.startsWith("http://") || tab.url.startsWith("https://"))) {
          // Usa chrome.scripting.executeScript para Manifest V3
          window.chrome.scripting.executeScript(
            {
              target: { tabId: tab.id },
              function: () => {
                // Verifica se a página foi processada pela extensão
                if (document.body && document.body.classList.contains("json-viewer-active")) {
                  window.location.reload()
                }
              },
            },
            () => {
              // Ignora erros (aba pode não ter permissão ou ser uma página interna do Chrome)
              if (window.chrome.runtime.lastError) {
                // console.warn("Erro ao recarregar aba:", window.chrome.runtime.lastError.message);
              }
            },
          )
        }
      })
    })
  }

  // Incrementa contador de JSON processados
  function incrementJsonCount() {
    window.chrome.storage.sync.get(['jsonProcessed', 'timeSaved'], (data) => {
      const newCount = (data.jsonProcessed || 0) + 1
      const newTime = (data.timeSaved || 0) + Math.floor(Math.random() * 3) + 1 // Simula tempo economizado
      
      window.chrome.storage.sync.set({
        jsonProcessed: newCount,
        timeSaved: newTime
      }, () => {
        jsonCount.textContent = newCount
        timeSaved.textContent = `${newTime}min`
      })
    })
  }

  // Event listeners
  themeSelect.addEventListener("change", (e) => {
    // Apenas atualiza o preview, não salva automaticamente
    updatePreview(e.target.value)
  })

  fontSelect.addEventListener("change", (e) => {
    // Atualiza a configuração atual, mas não salva automaticamente
    currentSettings.font = e.target.value
  })

  indentRadios.forEach(radio => {
    radio.addEventListener("change", (e) => {
      // Atualiza a configuração atual, mas não salva automaticamente
      currentSettings.indentation = parseInt(e.target.value)
    })
  })

  saveBtn.addEventListener("click", saveSettings)
  resetBtn.addEventListener("click", resetSettings)

  // Inicialização
  document.addEventListener("DOMContentLoaded", () => {
    loadSettings()
    
    // Simula incremento de contador quando popup é aberto
    setTimeout(incrementJsonCount, 1000)
  })

  // Adiciona efeitos visuais aos cards
  const bentoCards = document.querySelectorAll('.bento-card')
  bentoCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-4px) scale(1.02)'
    })
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(0) scale(1)'
    })
  })
})()
