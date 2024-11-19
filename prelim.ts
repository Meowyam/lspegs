//vscode extension possibilities

// possible interfaces for the code analysis request.
// we can trigger it here, a button seems like a better idea than do it on file changes, and also where we do diagnostics (errors etc.)
// also assumes for now that the l4 in the editor gets dumped in a tmp file

interface L4AnalysisParams {
  code: TextDocument
}

interface L4AnalysisResponse {
  visData?: VisJSON
  diagnostics?: Diagnostic[] //LSP diagnostics (https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#diagnostic)
  version: number // track version for changes
}

// LSP analysis request function
method: 'l4/analysis'

// so something like this on the vscode extension client:
class L4Client {
  private connection: Connection

  // send analysis request
  async requestAnalysis(document: TextDocument): Promise<L4AnalysisResponse> {
    const params = {
      textDocument: { uri: document.uri.toString() },
        version: document.version
    }

    try {
      // send request to server here
      const response = await this.connection.sendRequest(
          l4/analysis,  // this is the LSP method
          params
      )
      return response
    } catch (error) {
      console.error('error messages here:', error)
      throw error
    }
  }

  // init, custom stuff
  initialize(): void {
    const capabilities = {
      customCapabilities: {
        analyzeSupportEnabled: true
      }
    }

    this.connection.sendRequest('initialize', { capabilities })
  }
}

/// from here onwards we imagine how things fit together

// we send only incremental updates when the user makes changes to the editor
// maybe here we do debouncing
// maybe here also we send just partial responses

interface L4IncrementalUpdateParams {
  textDocument: VersionedL4
  range: Range // range of change
  text: string // the changes
}

interface L4IncrementalUpdateResponse {
  textDocument: VersionedL4
  range: Range
  text: string
}

// LSP request for this
method: 'l4/incrementalUpdate'

//handling l4 from code editor, the editor sends notifications about visualisation updates

// I guess here we'll put a notification that the analysis part is complete? with a boolean.

method: 'l4/analysisComplete'
params: {
  uri: string // obviously URI of tmp doc that has new vis data
  success: boolean
  version: number // or maybe a timestamp
}

method: 'l4/visUpdate'
params: {
  uri: string
  visualizationData: VisJSON
}

// function that triggers analysis request
async function doL4Update(document: TextDocument) {
  const params: L4AnalysisParams = {
    textDocument: { uri: document.uri.toString() },
  }

  // and here we do the request to the lsp server. this is the super most basic
  const response = await connection.sendRequest('l4/analyse', params)

  // and here is the response and posts vis data to webview component thing
  if (response.visData) {
    postMessageToWebview('updateVisualisation', response.visData)
  }
}

// listens for l4/visUpdate notifications from the LSP server.
// sends updated visu data to the web component

connection.onNotification('l4/visUpdate', (params: { uri: string; visData: VisJSON }) => {
  if (params.visData) {
    postMessageToWebview('updateVisualisation', params.visData)
  }
})

// the lsp server sends something like this:
connection.sendNotification('l4/visUpdate', {
  uri: document.uri,
  visData: updatedVisData,
});