fetch("branchConfig.json")
  .then(function(response) {
    return response.json();
  })
  .then(function(config) {

    // ─── Generator functions ───────────────────────────────────────────────

    function buildBaseUrl(domain, basePath) {
      return "https://" + domain + basePath;
    }

    function buildFallbackBaseUrl(domain, basePath) {
      return encodeURIComponent("https://" + domain + basePath);
    }

    function buildStandardParams(schema) {
      let deepLink = "$deep_link=true";
      let campaign = schema === "rt"
        ? "~campaign=<%=rtEvent.type%>"
        : "~campaign=<%=delivery.deliveryCode%>";
      return deepLink + "&" + campaign;
    }

    function buildLinkParams(params) {
      let firstParamStrings = [];
      let defaultParamStrings = [];

      for (let param of params) {
        if (param.position === "first") {
          firstParamStrings.push(param.key + "=" + param.value);
        } else {
          defaultParamStrings.push(param.key + "=" + param.value);
        }
      }

      return firstParamStrings.concat(defaultParamStrings).join("&");
    }

    function encodeFallbackString(fallbackString) {
      let parts = fallbackString.split(/(<%=.*?%>)/g);
      return parts.map(function(part) {
        return part.match(/<%=.*?%>/) ? part : encodeURIComponent(part);
      }).join("");
    }

    function buildSchemaParams(schemaData) {
      let paramString = [];
      for (let key in schemaData) {
        if (schemaData[key] !== null) {
          paramString.push(key + "=" + schemaData[key]);
        }
      }
      return paramString.join("&");
    }

    function generateBranchLink(link, schema, environment, schemas) {
      let basePath = link.customUrl
        ? extractBasePath(link.customUrl)
        : link.basePath;

      let baseUrl = buildBaseUrl(environment, basePath);
      let standardParams = buildStandardParams(schema);
      let linkParams = buildLinkParams(link.params);
      let fallbackBaseUrl = buildFallbackBaseUrl(environment, basePath);
      let fallbackSchemaParams = buildSchemaParams(schemas[schema]);
      let fallbackParamString = linkParams
        ? fallbackSchemaParams + "&" + linkParams
        : fallbackSchemaParams;
      let encodedFallbackParams = encodeFallbackString("?" + fallbackParamString);

      let mainParams = standardParams;
      if (linkParams) mainParams += "&" + linkParams;

      return baseUrl + "?" + mainParams + "&$fallback_url=" + fallbackBaseUrl + encodedFallbackParams;
    }

    function extractBasePath(url) {
      let match = url.match(/^https?:\/\/[^/]+(\/.*)?$/);
      return match ? (match[1] || "/") : "/";
    }

    function getEnvironmentDomain(envKey) {
      return config.environments[envKey];
    }

    // ─── State ─────────────────────────────────────────────────────────────

    let prodLink = "";
    let qa5Link = "";
    let currentTab = "prod";

    // ─── Tom Select: searchable link dropdown ──────────────────────────────

    // Populate environment (plain select — only 2 options)
    let environmentSelect = document.getElementById("environmentSelect");
    for (let key in config.environments) {
      let option = document.createElement("option");
      option.value = key;
      option.text = key;
      environmentSelect.appendChild(option);
    }

    // Populate schema (plain select)
    let schemaSelect = document.getElementById("schemaSelect");
    for (let key in config.schemas) {
      let option = document.createElement("option");
      option.value = key;
      option.text = key;
      schemaSelect.appendChild(option);
    }

    // Populate link dropdown with Tom Select for search
    let linkSelectEl = document.getElementById("linkSelect");

    // Add Custom URL option first
    let customOption = document.createElement("option");
    customOption.value = "__custom__";
    customOption.text = "Custom URL...";
    linkSelectEl.appendChild(customOption);

    // Add all links
    for (let link of config.links) {
      let option = document.createElement("option");
      option.value = link.id;
      option.text = link.id;
      linkSelectEl.appendChild(option);
    }

    // Init Tom Select
    let tomSelect = new TomSelect("#linkSelect", {
      placeholder: "Search or select a link...",
      allowEmptyOption: true,
      maxOptions: 200,
    });

    // ───     UI event handlers ─────────────────────────────────────────────────

    function getSelectedLink() {
      let selectedId = tomSelect.getValue();
      if (!selectedId || selectedId === "") return null;
      if (selectedId === "__custom__") {
        let customUrl = document.getElementById("customUrlInput").value.trim();
        if (!customUrl) return null;
        return {
          id: "__custom__",
          customUrl: customUrl,
          basePath: extractBasePath(customUrl),
          searchToken: false,
          params: [
            { key: "clk", value: "", position: "default" }
          ]
        };
      }
      return config.links.find(function(l) { return l.id === selectedId; });
    }

    function renderParams(link) {
      let paramsContainer = document.getElementById("paramsContainer");
      paramsContainer.innerHTML = "";

      if (!link) {
        paramsContainer.innerHTML = '<div style="font-size:12px;color:var(--text-dim);padding:8px 0;">Select a link to see parameters.</div>';
        return;
      }

      if (link.searchToken) {
        let badge = document.createElement("div");
        badge.className = "search-token-badge";
        badge.textContent = "Search token link";
        paramsContainer.appendChild(badge);
      }

      for (let param of link.params) {
        let row = document.createElement("div");
        row.className = "param-row";

        let keyLabel = document.createElement("div");
        keyLabel.className = "param-key";
        keyLabel.textContent = param.key;

        let input = document.createElement("input");
        input.type = "text";
        input.className = "param-input";
        input.id = "param-" + param.key;
        input.value = param.value;
        input.placeholder = param.key === "clk" ? "Enter clk code" : param.value ? "" : "Enter value";

        row.appendChild(keyLabel);
        row.appendChild(input);
        paramsContainer.appendChild(row);
      }
    }

    // Show/hide custom URL field
    tomSelect.on("change", function(value) {
      let customUrlField = document.getElementById("customUrlField");
      if (value === "__custom__") {
        customUrlField.style.display = "block";
        renderParams(null);
      } else {
        customUrlField.style.display = "none";
        let link = config.links.find(function(l) { return l.id === value; });
        renderParams(link || null);
      }
      // Hide output when link changes
      document.getElementById("outputContent").style.display = "none";
      document.getElementById("outputEmpty").style.display = "block";
      document.getElementById("clkWarning").style.display = "none";
    });

    // Custom URL field: render default clk param when URL is typed
    document.getElementById("customUrlInput").addEventListener("input", function() {
      let customUrl = this.value.trim();
      if (customUrl) {
        renderParams({
          searchToken: false,
          params: [{ key: "clk", value: "", position: "default" }]
        });
      }
    });

    // ─── Generate ──────────────────────────────────────────────────────────

    document.getElementById("generateBtn").addEventListener("click", function() {
      let envKey = environmentSelect.value;
      let schema = schemaSelect.value;
      let link = getSelectedLink();

      if (!envKey || !schema || !link) {
        alert("Please select an environment, schema, and link.");
        return;
      }

      // Read current param values from inputs
      let params = link.params.map(function(param) {
        let inputEl = document.getElementById("param-" + param.key);
        return {
          key: param.key,
          value: inputEl ? inputEl.value.trim() : param.value,
          position: param.position
        };
      }).filter(function(param) {
        return param.value !== "";
      });

      // clk warning
      let hasClk = params.some(function(p) { return p.key === "clk"; });
      let clkWarning = document.getElementById("clkWarning");
      clkWarning.style.display = hasClk ? "none" : "block";

      let linkWithParams = Object.assign({}, link, { params: params });

      // Generate both prod and qa5
      let prodDomain = config.environments["prod"];
      let qa5Domain = config.environments["qa5"];

      prodLink = generateBranchLink(linkWithParams, schema, prodDomain, config.schemas);
      qa5Link = generateBranchLink(linkWithParams, schema, qa5Domain, config.schemas);

      // Show output
      document.getElementById("outputEmpty").style.display = "none";
      document.getElementById("outputContent").style.display = "block";

      switchTab(currentTab);
    });

    // ─── Tabs + copy ───────────────────────────────────────────────────────

    window.switchTab = function(tab) {
      currentTab = tab;
      document.getElementById("tabProd").classList.toggle("active", tab === "prod");
      document.getElementById("tabQa5").classList.toggle("active", tab === "qa5");
      document.getElementById("outputBox").textContent = tab === "prod" ? prodLink : qa5Link;
      let copyBtn = document.getElementById("copyBtn");
      copyBtn.textContent = "Copy";
      copyBtn.classList.remove("copied");
    };

    window.copyOutput = function() {
      let text = currentTab === "prod" ? prodLink : qa5Link;
      navigator.clipboard.writeText(text).then(function() {
        let btn = document.getElementById("copyBtn");
        btn.textContent = "Copied!";
        btn.classList.add("copied");
        setTimeout(function() {
          btn.textContent = "Copy";
          btn.classList.remove("copied");
        }, 2000);
      });
    };

  });
