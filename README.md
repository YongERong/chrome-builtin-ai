![Tabby](https://github.com/YongERong/chrome-builtin-ai/blob/main/tabby.png?raw=True)

Ever find yourself drowning in a sea of tabs, trying to find an answer that you swore you saw just 5 minutes ago?

Tabby is here for you! It helps you to find the answers you need in the context of your tabs. Almost like RAG for tabs, you could say. And this all happens locally, from the safety of your device.

## How we built it
Tabby utilises the Tabs, Scripting and Prompt APIs for Chrome Extensions, to extract and make sense of your tabs. TTS and STT APIs to speak/listen to the user.

![Tabby_flow](https://github.com/YongERong/chrome-builtin-ai/blob/main/Tabby_flow.png?raw=True)

## Getting started with Tabby
1. Install Google Chrome Dev or Google Chrome Canary
2. Follow the steps at this document to enable Prompt API
3. Clone the repo
```git clone https://github.com/YongERong/chrome-builtin-ai.git```
4. Head to chrome://extensions, enable developer mode and click on "Load Unpacked", then select the "gemini-nano-demo" within the cloned repository
5. Enjoy!!

## Troubleshooting



## Challenges we ran into
- Output from the built-in model tends to be non-deterministic, which affects the consistency of the tool
- Token limit for the model is not as large as externally hosted models, cannot simply dump the entire tab text as context



## What's next for Tabby
- Implement summarisation API
