
fetch("branchConfig.json")
  .then(function(response) {
    return response.json();
  })
  .then(function(config) {
    console.log(config);
function buildBaseUrl(domain, basePath) {
  return "https://" + domain + basePath;
}

function buildFallbackBaseUrl(domain, basePath) {
	return encodeURIComponent("https://" + domain + basePath);
}

function buildStandardParams(schema) {
	let deepLink = "$deep_link=true";
	let campaign;
	if (schema === "rt") {
		campaign =  "~campaign=<%=rtEvent.type%>";
	   } else {
		campaign = "~campaign=<%=delivery.deliveryCode%>";
	   }
	return deepLink + "&" + campaign;
}


function buildLinkParams(params){

 let firstParamStrings = [];
 let defaultParamStrings = [];	
 
 for (let param of params) {	 
	 if (param.position === "first" ) {
		firstParamStrings.push(param.key + "=" + param.value);
		} else { 
		defaultParamStrings.push(param.key + "=" + param.value);
		}
 }
	let allParams = firstParamStrings.concat(defaultParamStrings);
	return allParams.join("&");
}

function encodeFallbackString(fallbackString) {
	let parts = fallbackString.split(/(<%=.*?%>)/g);
	
	let encodedParts = parts.map(function(part) {
		if (part.match(/<%=.*?%>/)) {
		return part;
	} else {
		return encodeURIComponent(part);
	}
		
	});

 return encodedParts.join("");
}


function buildSchemaParams(schemaData) {
let paramString = [];
	
for(let key in schemaData) {
		if (schemaData[key] !== null) {
			paramString.push(key + "=" + schemaData[key]);
		}
	} 
	return paramString.join("&");
}

function generateBranchLink(link, schema, environment, schemas) {
  let baseUrl = buildBaseUrl(environment, link.basePath);
  let standardParams = buildStandardParams(schema);
  let linkParams = buildLinkParams(link.params);
  let fallbackBaseUrl = buildFallbackBaseUrl(environment, link.basePath);
  let fallbackSchemaParams = buildSchemaParams(schemas[schema]);
let fallbackParamString = linkParams ? fallbackSchemaParams + "&" + linkParams : fallbackSchemaParams;
let encodedFallbackParams = encodeFallbackString("?" + fallbackParamString);

  let mainParams = standardParams;
  if (linkParams) {
    mainParams = mainParams + "&" + linkParams;
  }
	
  return baseUrl + "?" + mainParams + "&" + "$fallback_url=" + fallbackBaseUrl + encodedFallbackParams;
}


// populate environment dropdown
let environmentSelect = document.getElementById("environmentSelect");
for (let key in config.environments) {
  let option = document.createElement("option");
  option.value = config.environments[key];
  option.text = key;
  environmentSelect.appendChild(option);
}

// populate schema dropdown
let schemaSelect = document.getElementById("schemaSelect");
for (let key in config.schemas) {
  let option = document.createElement("option");
  option.value = key;
  option.text = key;
  schemaSelect.appendChild(option);
}

// populate link dropdown
let linkSelect = document.getElementById("linkSelect");
for (let link of config.links) {
  let option = document.createElement("option");
  option.value = link.id;
  option.text = link.label;
  linkSelect.appendChild(option);
}

// show params when link is selected
linkSelect.addEventListener("change", function() {
  let selectedLink = config.links.find(function(link) {
    return link.id === linkSelect.value;
  });

  let paramsContainer = document.getElementById("paramsContainer");
  paramsContainer.innerHTML = "";

  if (selectedLink) {
    for (let param of selectedLink.params) {
      let label = document.createElement("label");
      label.text = param.key;
      label.textContent = param.key;

      let input = document.createElement("input");
      input.type = "text";
      input.id = param.key;
      input.value = param.value;

      paramsContainer.appendChild(label);
      paramsContainer.appendChild(input);
    }
  }
document.getElementById("generateBtn").addEventListener("click", function() {
  let environment = environmentSelect.value;
  let schema = schemaSelect.value;
  let selectedLink = config.links.find(function(link) {
    return link.id === linkSelect.value;
  });

  if (!environment || !schema || !selectedLink) {
    alert("Please select an environment, schema, and link!");
    return;
  }

  // read current param values from input fields
let params = selectedLink.params.map(function(param) {
  return {
    key: param.key,
    value: document.getElementById(param.key).value,
    dynamic: param.dynamic,
    encode: param.encode,
    position: param.position
  };
}).filter(function(param) {
  return param.value !== "";
});

  selectedLink.params = params;

  let result = generateBranchLink(selectedLink, schema, environment, config.schemas);
  document.getElementById("output").textContent = result;
});


});

console.log(generateBranchLink(link, schema, environment, config.schemas));

  });




