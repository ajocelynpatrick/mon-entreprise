import React, { Component } from 'react'
import ResultsGrid from 'Components/ResultsGrid'
import { salaries } from 'Components/TargetSelection'
import { isEmpty, intersection, head } from 'ramda'
import Rule from 'Components/rule/Rule'
import './Explanation.css'

export default class Explanation extends Component {
	render() {
		let { targetRules } = this.props

		if (!targetRules) return null

		return <section id="explanation">{this.renderExplanation(targetRules)}</section>
	}
	renderExplanation(targetRules) {
		if (!isEmpty(intersection(targetRules, salaries))) return <ResultsGrid /> // Problem if targetRules is [salaire net, aides] the Explanation will not explain 'aides'. The user will have to click on Aides to understand it. Should we display a list of <Rule /> sections ?

		if (targetRules.length > 1)
			return <p>Cliquez sur les lignes de résultat ci-dessus pour les comprendre</p>

		return <Rule rule={head(targetRules)} />
	}
}
