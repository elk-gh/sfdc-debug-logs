import globalSf from '../../../global-sf'
import React from 'react'
import Icon from 'material-ui/Icon'
import AddIcon from 'material-ui-icons/AddCircle'
import RemoveIcon from 'material-ui-icons/RemoveCircle'
import IconButton from 'material-ui/IconButton'
import { withStyles } from 'material-ui/styles'
import { connect } from 'react-redux'
import { sfIdRegex, logEventToType } from '../constants'
const styles = theme => ({
  expandButton: {
    margin: 0,
    fontSize: 15,
    height: '1.5em',
    top: '0.2em'
  },
  logBodyPre: {
    whiteSpace: 'pre-wrap',
    lineHeight: '140%',
    fontFamily: "'Courier New', 'Courier', mono",
    marginLeft: '20px',
    overflowWrap: 'break-word'
  },
  logElement: {
    marginLeft: '0.6em',
    marginTop: '0.6em'
  }
})

function ParsedLog({ body, classes, logStyleConfig, visibleEvents }) {
  if (!body || body === '') return <div />
  const intro = body.match(
    /^\d{1,2}\.\d\s[^]*?(?=\d\d:\d\d:\d\d\.\d{0,3}\s\(\d+\))/m
  )
  const allTheRest = body.match(
    /^\d\d:\d\d:\d\d\.\d{0,3}\s\(\d+\)\|[A-Z_]*[^]*?(?=\d\d:\d\d:\d\d\.\d{0,3}\s\(\d+\))/gm
  )
  const visibleRest =
    visibleEvents.length == 0
      ? allTheRest
      : allTheRest.filter(body => {
          const eventTypeMatch = /^\d\d:\d\d:\d\d\.\d{0,3}\s\(\d+\)\|([A-Z_]*)/.exec(
            body
          )
          if (!eventTypeMatch) {
            console.error(`Didn't find event type for ${body} `)
            return false
          }
          const eventType = eventTypeMatch[1]
          return visibleEvents.indexOf(eventType) > -1
        })
  return (
    <pre
      className={classes.logBodyPre}
      style={{ fontSize: logStyleConfig.fontSize }}
    >
      <div
        style={{ color: logStyleConfig.theme.system }}
        className={classes.logElement}
      >
        {intro}
      </div>
      {visibleRest.map((body, index) => {
        return (
          <LogElement
            body={body}
            logTheme={logStyleConfig.theme}
            key={index}
            className={classes.logElement}
          />
        )
      })}
    </pre>
  )
}

const mapStateToProps = state => ({
  visibleEvents: state.logsPage.visibleEvents
})

export default connect(
  mapStateToProps,
  () => ({})
)(withStyles(styles)(ParsedLog))

@withStyles(styles)
class LogElement extends React.Component {
  constructor(props) {
    super(props)
    this.toggleIndentation = this.toggleIndentation.bind(this)
    this.state = { indented: props.indented }
  }

  toggleIndentation() {
    this.setState(prevState => ({
      ...prevState,
      indented: !prevState.indented
    }))
  }

  render() {
    const { body, classes, logTheme } = this.props
    const { indented } = this.state
    const eventTypeMatch = /^\d\d:\d\d:\d\d\.\d{0,3}\s\(\d+\)\|([A-Z_]*)/.exec(
      body
    )
    if (!eventTypeMatch) {
      console.error(`Didn't find event type for ${body} `)
      return null
    }
    const eventType = eventTypeMatch[1]
    const beautify = elementBody => {
      if (eventType === 'USER_DEBUG' && indented) {
        const parsedUserDebug = elementBody.match(
          /^(\d\d:\d\d:\d\d\.\d{0,3}\s\(\d+\)\|USER_DEBUG\|[\d+\]\|[A-Z_]+\|)([^]*)/m
        )
        if (parsedUserDebug && parsedUserDebug.length > 2) {
          return `${parsedUserDebug[1]}${beautifyUserDebug(parsedUserDebug[2])}`
        }
      }
      return elementBody
    }

    const addLinks = elementBody => {
      if (!sfIdRegex.test(elementBody)) return elementBody
      let textElements = elementBody.split(sfIdRegex)
      let result = []
      elementBody.replace(sfIdRegex, id => {
        result.push(textElements.shift())
        result.push(
          <a
            href={`https://${globalSf.hostname}/${id}`}
            style={{ color: logTheme[className] }}
            key={result.length}
          >
            {id}
          </a>
        )
      })
      return result
    }

    const filtered = Object.entries(logEventToType).find(me =>
      eventType.startsWith(me[0])
    )
    const className = filtered ? filtered[1] : 'rest'
    return (
      <div
        style={{ color: logTheme[className] }}
        className={classes.logElement}
      >
        {eventType === 'USER_DEBUG' ? (
          <IconButton
            color="contrast"
            className={classes.expandButton}
            aria-label="Add"
            onClick={this.toggleIndentation}
            style={{ color: logTheme.rest }}
          >
            {indented ? <RemoveIcon /> : <AddIcon />}
          </IconButton>
        ) : null}
        {addLinks(beautify(body), className)}
      </div>
    )
  }
}

function beautifyUserDebug(userDebug) {
  if (looksLikeHtml(userDebug)) {
    return html_beautify(userDebug)
  }
  if (isJsonString(userDebug)) {
    return JSON.stringify(JSON.parse(userDebug), null, 2)
  }
  if (looksLikeSfdcObject(userDebug)) {
    return js_beautify(sfdcObjectBeautify(userDebug))
  }
  return userDebug
}

function isJsonString(str) {
  try {
    JSON.parse(str)
  } catch (e) {
    return false
  }
  return true
}

function sfdcObjectBeautify(string) {
  string = string.replace(/={/g, ':{')
  return string.replace(/([{| |\[]\w+)=(.+?)(?=, |},|}\)|:{|])/g, function(
    match,
    p1,
    p2
  ) {
    return p1 + ":'" + p2 + "'"
  })
}

function looksLikeSfdcObject(string) {
  return string.match(/\w+:{\w+=.+,?\s*}/)
}

function looksLikeHtml(source) {
  var trimmed = source.replace(/^[ \t\n\r]+/, '')
  return trimmed && trimmed.substring(0, 1) === '<'
}
