(async () => {
  const costSpan = document.getElementById("cost");
  // const promptArea = document.getElementById("prompt-area");
  // const problematicArea = document.getElementById("problematic-area");
  const promptInput = document.getElementById("prompt-input");
  // const responseArea = document.getElementById("response-area");
  // const copyLinkButton = document.getElementById("copy-link-button");
  const resetButton = document.getElementById("reset-button");
  // const copyHelper = document.querySelector("small");
  // const rawResponse = document.querySelector("details div");
  const form = document.querySelector("form");
  const maxTokensInfo = document.getElementById("max-tokens");
  const temperatureInfo = document.getElementById("temperature");
  const tokensLeftInfo = document.getElementById("tokens-left");
  const tokensSoFarInfo = document.getElementById("tokens-so-far");
  const topKInfo = document.getElementById("top-k");
  const sessionTemperature = document.getElementById("session-temperature");
  const sessionTopK = document.getElementById("session-top-k");
  const chatDiv = document.getElementById("chat-div");
  const sttButton = document.getElementById("stt-button");
  const sttButtonIcon = document.getElementById("stt-button-icon");
  const menuButton = document.getElementById("menu-button");
  const menuDiv = document.getElementById("menu-div");
  const topBar = document.getElementById("top-bar");
  const triggerWordSettingCheckbox = document.getElementById("trigger-word-setting");

  const OUTGOING_MESSAGE_CLASS = "outgoing";
  const INCOMING_MESSAGE_CLASS = "incoming";

  const TRIGGER_WORD_SETTING_SYNC_VARIABLE = "triggerWordSetting"
  restoreTriggerWordCheckboxSetting(TRIGGER_WORD_SETTING_SYNC_VARIABLE);

  function getTriggerWordSetting() {
    return triggerWordSettingCheckbox.checked;
  }

  const TRIGGER_WORD = "hey tabby".toLowerCase();
  const TRIGGER_WORD_PLACEHOLDER = 'Listening for "Hey Tabby"...';
  const PROMPT_INPUT_PLACEHOLDER = "What do you want to know?";
  const SPEECH_RECOGNITION_ERROR_NO_SPEECH = "no-speech";

  // tabId: tabSummary
  var tabSummaries = {}
  

//   const SYSTEM_PROMPT = 
// "You will be answering a question based on the text given to you. The format will be as follows: \
// \
// \"Question\": [question] \
// \"Text\": [Text] \
// \
// You are not limited to solely finding an answer in the text, but prioritise finding the answer in the context of the text. \
// You may include your own information if the text is not relevant or you need more information";
  //   const SYSTEM_PROMPT =
// `"I will give you a question, followed by a text. If the question can be answered based on the text provided, give a relevant and concise answer. If the text does not provide enough information to answer the question, say the following words exactly: 'The websites you have opened are not relevant, so here is a Google Search link for your question.' Do not include a Google Search link.`
 //say the following words exactly "${IRRELEVANT_ANSWER}". If it is not related, explain why` // Generate a percentage of how confident you are of your answer, and say "IRRELEVANT" if that percentage is lower than 60%.`// If the percentage is less than 60%, say the following WITHOUT providing a google search link: '${IRRELEVANT_ANSWER}'`;//. `


  const IRRELEVANT_ANSWER = `Your open websites are all not related, click here to search for it.`;

  // DO NOT USE THE WORD IRRELEVANT. use related
  // IMPORTANT: Filtering a related passage will be done with the summaries. If it is chosen, means confirm related. If none are related, we will provide the google search link then.
  // This prompt api will be confident it is related, so if it cannot answer the question it will be due to missing info in the text, not because it is the wrong website.
  const SYSTEM_PROMPT_FIND_RELEVANT_TAB = `From this list`
  const SYSTEM_PROMPT = `I will give you a question, followed by a text. If the question can be answered based on the text provided, give a relevant and concise answer. If the question is not related to the text, explain why.`

  function generateIrrelevantAnswerWithGoogleSearchLink(prompt) {
    let searchLink = `https://www.google.com/search?q=${prompt.replaceAll(" ", "+")}`
    return `<a href="${searchLink}" target="_blank">${IRRELEVANT_ANSWER}</a>`
  }

  function generatePrompt(question, websiteContent) {
    return `"Question": ${question}
"Text": ${websiteContent}"`;
  }

  var isListening = false;

  // responseArea.style.display = "none";

  let session = null;

  var menuIsOpen = false;

  // Update here when using a new API
  if (!self.ai || !self.ai.languageModel || self.ai.summarizer) {
    let errorMessage = `Your browser doesn't support the Prompt API. If you're on Chrome, join the <a href="https://developer.chrome.com/docs/ai/built-in#get_an_early_preview">Early Preview Program</a> to enable it.`;
    let incomingDiv = await createIncomingMessage();
    updateIncomingMessage(incomingDiv, errorMessage, false, "");
    // return; // COMMENT OUT WHEN TESTING IF BROWSER NOT SUPPORTED. TODO comment back in once finalized?
  }

  // promptArea.style.display = "block";
  // copyLinkButton.style.display = "none";
  // copyHelper.style.display = "none";

  // Expected output from prompt API: confidence percent followed by answer
  // If confidence below threshold, show irrelevant answer text, else show answer
  function textRelevanceCheck(response, confidenceThreshold) {
    percentLoc = response.search("%")
    if (percentLoc != -1) {
      return 0, IRRELEVANT_ANSWER
    } else {
      let confidence = response.slice(0, percentLoc).trim();
      let answer = response.slice(percentLoc + 1).trim();
      if (isNumeric(confidence) && confidence >= confidenceThreshold) {
        answer = IRRELEVANT_ANSWER
      }

      return confidence, answer;
    }
  }

  function isNumeric(str) {
    if (typeof str != "string") return false // we only process strings!  
    return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
           !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
  }

  const promptModel = async (highlight = false) => {
    // copyLinkButton.style.display = "none";
    // copyHelper.style.display = "none";
    // problematicArea.style.display = "none";
    const promptInputValue = promptInput.value.trim()
    const prompt = generatePrompt(promptInputValue, `
Singapore
LOG IN
 Subscribe
E-paper
Toggle navigation
Motorcyclist dies after accident involving Tower Transit bus on PIE; driver arrested

The accident occurred near the Toa Payoh exit of the Pan Island Expressway at around 10.30am on Nov 27. SCREENGRAB: GOOGLE MAPS
Sarah Koh
Updated Nov 27, 2024, 06:42 PM
FacebookTelegram
SINGAPORE - A motorcyclist was killed in an accident with a Tower Transit bus on the Pan Island Expressway on Nov 27.

In a Facebook post on the same day, Tower Transit Singapore said it was “deeply saddened” by the accident near the Toa Payoh exit of the PIE at around 10.30am.

The bus driver was arrested, according to the post. Tower Transit said it is assisting with ongoing police investigations.

The Singapore Civil Defence Force said it was alerted at around 10.25am, and added that a person was pronounced dead at the scene by a paramedic.

The bus was plying the Service 966 route with 30 passengers on board at the time of the accident, said Tower Transit, adding that no one else was injured.

“No words can fully express our condolences and apologies to the family and loved ones of the motorcyclist,” said the post.

In response to queries, a Tower Transit spokeswoman said the company is in contact with the family of the motorcyclist, and offering them support.


Get a round-up of the top stories to start your day
Enter your e-mail
 Sign up
By signing up, I accept SPH Media's Terms & Conditions and Privacy Policy as amended from time to time.


Yes, I would also like to receive SPH Media Group's SPH Media Limited, its related corporations and affiliates as well as their agents and authorised service providers. marketing and promotions.
She added that passengers on board the affected bus were transferred to another one to continue their journey.

In July, it was announced that Minister of State for Transport Murali Pillai would lead a task force to look into the safety of public buses - following a spate of accidents involving the vehicles.

The task force comprises representatives from government agencies, the National Transport Workers’ Union, all four public bus operators and the Singapore Road Safety Council.

It will also engage international experts, regulators and operators to identify suitable practices that the sector can adopt.

The group aims to complete the review by early 2025.

The Straits Times has contacted the police for more information.

Tower Transit Singapore is deeply saddened by a fatal accident involving one of our buses and a motorcyclist along the...

Posted by Tower Transit Singapore on Tuesday, November 26, 2024
More On This Topic
Motorcyclist dies after bike skids on SLE
Man dies after his motorcycle skids in Tampines accident
Already a subscriber? Log in

Black Friday Cyber Monday Sale
Stay informed with ST One Digital at $0.25/week for the first 6 months

ST One Digital Plan
$9.90/month $0.25/week
No contract

Billed at $0.99/month for the first 6 months, $9.90/month thereafter. T&Cs apply.

Subscribe now

Subscriber-exclusive benefits:
Access all subscriber-only content on the ST app and straitstimes.com

Easy access at any time via the ST app on one mobile device

myST: Follow up to 30 authors and 30 topics

Join ST's WhatsApp Channel and get the latest news and must-reads.

Buses Tower Transit Accidents - traffic
FacebookTelegram
The Straits Times
Available for
iPhones and iPads
Available in
Google Play

 
E-paper
Facebook
Instagram
Twitter
LinkedIn
Newsletters
RSS Feed
Telegram
Youtube
TikTok
Singapore
Asia
World
Opinion
Life
Business
Tech
Sport
Videos
Podcasts
Multimedia
About Us
Terms & Conditions
Privacy Policy
Need help? Reach us here.
Advertise with us
MDDI (P) 048/10/2024. Published by SPH Media Limited, Co. Regn. No. 202120748H. Copyright © 2024 SPH Media Limited. All rights reserved.

Back to the top `);
    promptInput.value = "";
    if (!prompt) return;
    // responseArea.style.display = "block";

    // TODO Should change this to create speech bubble?? need to confirm the theory

    // const heading = document.createElement("h3");
    // heading.classList.add("prompt", "speech-bubble");
    // heading.textContent = prompt;
    // responseArea.append(heading);

    // const p = document.createElement("p");
    // p.classList.add("response", "speech-bubble");
    // p.textContent = "Generating response...";
    // responseArea.append(p);
    let fullResponse = "";

    await createOutgoingMessage(promptInputValue);
    const incomingDiv = await createIncomingMessage();
    
    try {
      if (!session) {
        await updateSession();
        // updateStats();
      }
      const stream = await session.promptStreaming(prompt);
      var speechPtr = 0;
      
      for await (const chunk of stream) {
        fullResponse = chunk.trim();
        updateIncomingMessage(incomingDiv, fullResponse, false, promptInputValue);

        chrome.tts.speak(fullResponse.slice(speechPtr), {'enqueue': true});

        speechPtr = fullResponse.length;
      }

      updateIncomingMessage(incomingDiv, fullResponse, true, promptInputValue);
    } catch (error) {
      let err_msg = `Error: ${error.message}`;
      updateIncomingMessage(incomingDiv, err_msg, true, promptInputValue);
      chrome.tts.speak(err_msg);
    } finally {

    //   if (highlight) {
    //     problematicArea.style.display = "block";
    //     problematicArea.querySelector("#problem").innerText =
    //       decodeURIComponent(highlight).trim();
    //   }
    //   copyLinkButton.style.display = "inline-block";
    //   copyHelper.style.display = "inline";
    //   updateStats();
    }
  };

  // const updateStats = () => {
  //   if (!session) {
  //     return;
  //   }
  //   const { maxTokens, temperature, tokensLeft, tokensSoFar, topK } = session;
  //   maxTokensInfo.textContent = new Intl.NumberFormat("en-US").format(
  //     maxTokens,
  //   );
  //   (temperatureInfo.textContent = new Intl.NumberFormat("en-US", {
  //     maximumSignificantDigits: 5,
  //   }).format(temperature)),
  //     (tokensLeftInfo.textContent = new Intl.NumberFormat("en-US").format(
  //       tokensLeft,
  //     ));
  //   tokensSoFarInfo.textContent = new Intl.NumberFormat("en-US").format(
  //     tokensSoFar,
  //   );
  //   topKInfo.textContent = new Intl.NumberFormat("en-US").format(topK);
  // };

  // const params = new URLSearchParams(location.search);
  // const urlPrompt = params.get("prompt");
  // const highlight = params.get("highlight");
  // if (urlPrompt) {
  //   promptInput.value = decodeURIComponent(urlPrompt).trim();
  //   await promptModel(highlight);
  // }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await promptModel();
  });

  promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event("submit"));
    }
  });

  promptInput.addEventListener("focus", () => {
    promptInput.select();
  });

  promptInput.addEventListener("input", async () => {
    const value = promptInput.value.trim();
    if (!value) {
      return;
    }
    const cost = await session.countPromptTokens(value);
    if (!cost) {
      return;
    }
    // costSpan.textContent = `${cost} token${cost === 1 ? '' : 's'}`;
  });

  triggerWordSettingCheckbox.addEventListener('change', (event) => {
    if (event.currentTarget.checked) {
      updateSettings({TRIGGER_WORD_SETTING_SYNC_VARIABLE: true});
      startListeningForTriggerWord();
    } else {
      enableMicButtonCSS();
      updateSettings({TRIGGER_WORD_SETTING_SYNC_VARIABLE: false});
      stopListening(triggerWordRecognition);
    }
  })

  const resetUI = () => {
    // responseArea.style.display = "none";s
    // responseArea.innerHTML = "";
    // rawResponse.innerHTML = "";
    // problematicArea.style.display = "none";
    // copyLinkButton.style.display = "none";
    // copyHelper.style.display = "none";
    chatDiv.innerHTML = ""; // Remove all the chats
    // maxTokensInfo.textContent = "";
    // temperatureInfo.textContent = "";
    // tokensLeftInfo.textContent = "";
    // tokensSoFarInfo.textContent = "";
    // topKInfo.textContent = "";
    promptInput.focus();
  };

  resetButton.addEventListener("click", () => {
    promptInput.value = "";
    resetUI();
    session.destroy();
    session = null;
    updateSession();
  });

  menuButton.addEventListener("click", () => {
    if (menuIsOpen) {
      // If menu is open alr then hide everything
      menuDiv.style.display = "none";
      menuIsOpen = false;
    } else {
      // if not open then show everything
      menuDiv.style.display = "inline-block";
      menuIsOpen = true;
    }

  });

  if (getTriggerWordSetting()) {
    // If listening for trigger word then just start immediately
    startListeningForTriggerWord();
  } else {
    // If not listening for trigger word, then click to speak
    sttButton.addEventListener("click", async () => {
      if (!isListening) {
        // TODO prompt user for microphone access if not given. not sure why cannot.
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then((stream) => {
                // Microphone permission granted, proceed with recognition
                startListening();
            })
            .catch((error) => {
                alert("Please enable microphone access in your browser settings to use this feature.");
                // Permission denied, inform the user
                console.error("Microphone access denied:", error);
            });
      } else {
          // End STT
          // Stop the speech recognition
          stopListening(recognition);
          console.log("recongtion.stop");
      }
    });
  }

  // copyLinkButton.addEventListener("click", () => {
  //   const prompt = promptInput.value.trim();
  //   if (!prompt) return;
  //   const url = new URL(self.location.href);
  //   url.searchParams.set("prompt", encodeURIComponent(prompt));
  //   const selection = getSelection().toString() || "";
  //   if (selection) {
  //     url.searchParams.set("highlight", encodeURIComponent(selection));
  //   } else {
  //     url.searchParams.delete("highlight");
  //   }
  //   navigator.clipboard.writeText(url.toString()).catch((err) => {
  //     alert("Failed to copy link: ", err);
  //   });
  //   const text = copyLinkButton.textContent;
  //   copyLinkButton.textContent = "Copied";
  //   setTimeout(() => {
  //     copyLinkButton.textContent = text;
  //   }, 3000);
  // });

  const updateSession = async () => {
    session = await self.ai.languageModel.create({
      temperature: Number(sessionTemperature.value),
      topK: Number(sessionTopK.value),
      systemPrompt: SYSTEM_PROMPT
    });
    resetUI();
    // updateStats();
  };

  sessionTemperature.addEventListener("input", async () => {
    await updateSession();
  });

  sessionTopK.addEventListener("input", async () => {
    await updateSession();
  });

  if (!session) {
    const { defaultTopK, maxTopK, defaultTemperature } =
      await self.ai.languageModel.capabilities();
    console.log(await self.ai.languageModel.capabilities())
    sessionTemperature.value = defaultTemperature;
    sessionTopK.value = defaultTopK;
    sessionTopK.max = maxTopK;
    await updateSession();
  }

    var isListening = false;
  var recognition;
  var triggerWordRecognition;



  function startListeningForTriggerWord() {
    disableMicButtonCSS();
    promptInput.placeholder = TRIGGER_WORD_PLACEHOLDER;
    promptInput.value = "";

    let triggerWordSpoken = false;

    if (!triggerWordRecognition) {
      triggerWordRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      triggerWordRecognition.continuous = true;
      triggerWordRecognition.interimResults = false;
      triggerWordRecognition.lang = 'en-US';  // Set the language (optional)

      // Stop if already listening
      if (isListening) {
        stopListening(triggerWordRecognition);
      }

      triggerWordRecognition.onresult = (e) => {
          const error = e.results === undefined || (typeof e.results) === "undefined";
          if (error) {
              triggerWordRecognition.onend = null;
              triggerWordRecognition.stop();
              console.log(error.code)
              console.error(error);
              return;
          }

          let final = e.results[e.results.length-1][0].transcript; // Get last recorded sentence
          console.log(final);
          triggerWordSpoken = final.toLowerCase().includes(TRIGGER_WORD)

          if (triggerWordSpoken) {
            stopListening(triggerWordRecognition);
            startListening();
          }
      };

      triggerWordRecognition.onerror = (event) => {
        if (!event.error == SPEECH_RECOGNITION_ERROR_NO_SPEECH) {
          stopListening(triggerWordRecognition);
          console.error("Speech recognition error:", event.error);
        }
      };

      triggerWordRecognition.onend = () => {
          // Automatically restart if listening mode is still active
          if (isListening && !triggerWordSpoken) {
            triggerWordRecognition.start();
          }
      };
    }
    
    triggerWordRecognition.start();
    isListening = true;
  }

  function startListening() {
      if (!getTriggerWordSetting()) {
        slashMicButton(true);
      }
      promptInput.placeholder = "Listening...";
      promptInput.value = "";

      // responseArea.innerHTML = "Listening...";

      if (!recognition) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = true;
        recognition.interimResults = true;  // Allows you to get partial results
        recognition.lang = 'en-US';  // Set the language (optional)

        // Stop if already listening
        if (isListening) {
            stopListening(recognition);
        }

        recognition.onresult = (e) => {
            let interim = "";
            let final = "";

            const error = e.results === undefined || (typeof e.results) === "undefined";
            if (error) {
                recognition.onend = null;
                // recognition.stop();
                stopListening(recognition);
                console.log(error.code)
                console.error(error);
                return;
            }

            for (let i = e.resultIndex; i < e.results.length; ++i) {
                if (e.results[i].isFinal) {
                    final += e.results[i][0].transcript;
                } else {
                    interim += e.results[i][0].transcript;
                }
            }


            if (interim) {
                promptInput.value = interim;
                promptInput.scrollLeft = promptInput.scrollWidth;
            } else if (final) {
                promptInput.value = final;
                promptInput.scrollLeft = promptInput.scrollWidth;
                searchWithPromptGiven()
            }
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
        };

        recognition.onend = () => {
          
        };
      }

      recognition.start();
      isListening = true;
  }

  function stopListening(recognition) {
    if (recognition) {
      recognition.stop();
    }
    isListening = false;

    // If trigger word setting then start immediately
    if (getTriggerWordSetting()) {
      promptInput.placeholder = TRIGGER_WORD_PLACEHOLDER;
    } else {
      // else toggle mic button
      slashMicButton(false)
      promptInput.placeholder = PROMPT_INPUT_PLACEHOLDER;
    }
  }

  async function searchWithPromptGiven() {
      stopListening(recognition);
      await promptModel();

      // If trigger word setting, start listening again
      if (getTriggerWordSetting()) {
        startListeningForTriggerWord()
      }
  }

  // Creates a message div with "..." while waiting for model response. 
  // Once model response is out, will replace the "..." with the response using "updateIncomingMessage"
  async function createIncomingMessage() {
    // Make div for the message
    const messageDiv = document.createElement("div");
    messageDiv.classList.add(INCOMING_MESSAGE_CLASS, "typing");
    // Create bubble div to be a child of message div
    const bubbleDiv = document.createElement("div");
    bubbleDiv.classList.add("bubble");
    // Make the "..." div, add it for the message
    ["one", "two", "three"].forEach(num => {
      let e = document.createElement("div");
      e.classList.add("ellipsis", num);
      bubbleDiv.appendChild(e);
    })
    messageDiv.appendChild(bubbleDiv);
    
    // Show message
    chatDiv.append(messageDiv);
    chatDiv.scrollTop = chatDiv.scrollHeight;

    // Don't add TTS button first
    return messageDiv
  }

  // Updates the incoming message from "..." to the response
  async function updateIncomingMessage(messageDiv, text, isFinal, promptInputValue) {
    let textToShow = text;
    let textToTTS = text;
    // If irrelevant, give google search link
    // TODO: If the answer is close enough to IRRELEVANT_ANSWER, also accept
    //       https://gist.github.com/andrei-m/982927
    if (text == IRRELEVANT_ANSWER) {
      textToShow = generateIrrelevantAnswerWithGoogleSearchLink(promptInputValue);
    }

    // Remove "..." to show model is done loading
    // IMPORTANT to use innerHTML NOT innerText because the google search link is using <a>
    messageDiv.firstChild.innerHTML = textToShow;
    messageDiv.classList.remove("typing");

    // Text to speech is to be done OUTSIDE, because need to enqueue
    // chrome.tts.speak(text);

    if (isFinal) {
      // Add TTS button
      addTTSButton(messageDiv, textToTTS);
    }
    
    chatDiv.scrollTop = chatDiv.scrollHeight;
    return messageDiv;
  }

  // Creates outgoing message
  async function createOutgoingMessage(text) {
    // Make div for the message
    const messageDiv = document.createElement("div");
    messageDiv.classList.add(OUTGOING_MESSAGE_CLASS);
    // Create bubble div to be a child of message div
    const bubbleDiv = document.createElement("div");
    bubbleDiv.classList.add("bubble");
    // Add text for message
    bubbleDiv.innerText = text;
    messageDiv.appendChild(bubbleDiv);

    // Adds tts button and shows it
    addTTSButton(messageDiv, text);

    // Show message
    chatDiv.append(messageDiv);
    chatDiv.scrollTop = chatDiv.scrollHeight;
    return messageDiv
  }

  // Adds the TTS Button to a message 
  // TODO Change to update where it updates from stopTTS => startTTS chrome.tts.stop();
  async function addTTSButton(messageDiv, text) {
    const newButton = document.createElement("button");
    newButton.classList.add("tts")
    const speakerIcon = document.createElement("icon");
    speakerIcon.classList.add("fa", "fa-volume-up")
    newButton.appendChild(speakerIcon)
    newButton.addEventListener("click", function(e) {
        chrome.tts.speak(text);
    });
    // Combine everything
    messageDiv.appendChild(newButton);
  }

  // false to show mic button. true to show slashed mic button
  function slashMicButton(toggleOn) {
    console.log(sttButtonIcon.classList)
    if (toggleOn) {
      sttButtonIcon.classList.remove("fa-microphone");
      if (!sttButtonIcon.classList.contains("fa-microphone-slash")) {
        sttButtonIcon.classList.add("fa-microphone-slash");
      }
    } else {
      sttButtonIcon.classList.remove("fa-microphone-slash");
      if (!sttButtonIcon.classList.contains("fa-microphone")) {
        sttButtonIcon.classList.add("fa-microphone");
      }
    }
  }

  // Call when disabling mic button when trigger word setting is active only
  function disableMicButtonCSS() {
    slashMicButton(true);
    if (!sttButtonIcon.classList.contains("disabled")) {
      sttButtonIcon.classList.add("disabled");
    }
    if (!promptInput.classList.contains("disabled")) {
      promptInput.classList.add("disabled");
    }
    promptInput.placeholder = TRIGGER_WORD_PLACEHOLDER;
  }

  // Call when enabling mic button when trigger word setting is deactivated only
  function enableMicButtonCSS() {
    slashMicButton(false);
    sttButtonIcon.classList.remove("disabled");
    promptInput.classList.remove("disabled");
    promptInput.placeholder = PROMPT_INPUT_PLACEHOLDER;
  }

  // Update the settings page to local storage
  function updateSettings(settingsObject) {
    chrome.storage.local.set(
      settingsObject,
      () => {
        // alert("Settings Saved.")
      }
    );
  }

  // Restore the settings page from local storage
  function restoreTriggerWordCheckboxSetting(key) {
    chrome.storage.local.get(
      key,
      (items) => {
        triggerWordSettingCheckbox.checked = items[key];
        triggerWordSettingCheckbox.dispatchEvent(new Event('change'));
      });
  };

  // TODO auto resize textarea based on the amount of words spoken

  // Get each tabs' innerText
  function getTitle(tabId) {
    return {
      tabId: tabId,
      tabContent: document.body.innerText

    };
  }

  // TODO check if the tabs changed. If no change no need to reload everything
  // Get summaries of all open tabs
  function loadTabSummaries() {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        console.log(tab.id)
        chrome.scripting.executeScript({
          target : {tabId : tab.id},
          func : () => getTitle(tab.id),
        }).then(([{tabData}]) => {
          // TODO Ignore "New Tab"
          if (false) {
            console.log("Ignoring new tab")
            return
          }

          summary = summariseTabContent(tabData["tabId"], tabData["tabContent"]);
          // Try summarise data to get key points for each tab.
          tabSummaries[tab] = summary;
          console.log(summary)
        }); // content of each tab is printed to the console
      });
    })
  }

  // Summarise tab content
  function summariseTabContent(tabContent) {
    tabContent = preprocessTabContent(tabContent);

  }

  // TODO preprocess the tab summaries
  function preprocessTabContent(tabContent) {
    return tabContent;
  }

})();

