import { map, mergeAll, pick, pipe } from 'ramda'
import { typeWarning } from './error'
import {
	bonus,
	evaluateNode,
	mergeMissing,
	mergeAllMissing
} from './evaluation'
import { convertNodeToUnit } from './nodeUnits'
import { ParsedRule } from './types'

export const evaluateApplicability = (
	cache,
	situation,
	parsedRules,
	node: ParsedRule
) => {
	const evaluatedAttributes = pipe(
			pick(['non applicable si', 'applicable si', 'rendu non applicable']) as (
				x: any
			) => any,
			map(value => evaluateNode(cache, situation, parsedRules, value))
		)(node) as any,
		{
			'non applicable si': notApplicable,
			'applicable si': applicable,
			'rendu non applicable': disabled
		} = evaluatedAttributes,
		parentDependencies = node.parentDependencies.map(parent =>
			evaluateNode(cache, situation, parsedRules, parent)
		)

	const anyDisabledParent = parentDependencies.find(
		parent => parent?.nodeValue === false
	)

	const { nodeValue, missingVariables = {} } = anyDisabledParent
		? anyDisabledParent
		: notApplicable?.nodeValue === true
		? {
				nodeValue: false,
				missingVariables: notApplicable.missingVariables
		  }
		: applicable?.nodeValue === false
		? { nodeValue: false, missingVariables: applicable.missingVariables }
		: disabled?.nodeValue === true
		? { nodeValue: false, missingVariables: disabled.missingVariables }
		: {
				nodeValue: [notApplicable, applicable, ...parentDependencies].some(
					n => n?.nodeValue === null
				)
					? null
					: !notApplicable?.nodeValue &&
					  (applicable?.nodeValue == undefined || !!applicable?.nodeValue),
				missingVariables: mergeAllMissing(
					[...parentDependencies, notApplicable, disabled, applicable].filter(
						Boolean
					)
				)
		  }

	return {
		...node,
		nodeValue,
		isApplicable: nodeValue,
		missingVariables,
		parentDependencies,
		...evaluatedAttributes
	}
}

export default (cache, situation, parsedRules, node) => {
	cache._meta.contextRule.push(node.dottedName)
	const applicabilityEvaluation = evaluateApplicability(
		cache,
		situation,
		parsedRules,
		node
	)
	const {
		missingVariables: condMissing,
		nodeValue: isApplicable
	} = applicabilityEvaluation

	// evaluate the formula lazily, only if the applicability is known and true
	let evaluatedFormula =
		isApplicable && node.formule
			? evaluateNode(cache, situation, parsedRules, node.formule)
			: node.formule

	if (node.unit) {
		try {
			evaluatedFormula = convertNodeToUnit(node.unit, evaluatedFormula)
		} catch (e) {
			typeWarning(
				node.dottedName,
				"L'unité de la règle est incompatible avec celle de sa formule",
				e
			)
		}
	}
	const missingVariables = mergeMissing(
		bonus(condMissing, !!Object.keys(condMissing).length),
		evaluatedFormula.missingVariables
	)
	// console.log(node.dottedName, evaluatedFormula.unit)

	const temporalValue = evaluatedFormula.temporalValue
	cache._meta.contextRule.pop()
	return {
		...node,
		...applicabilityEvaluation,
		...(node.formule && { formule: evaluatedFormula }),
		nodeValue: evaluatedFormula.nodeValue,
		unit: node.unit ?? evaluatedFormula.unit,
		temporalValue,
		isApplicable,
		missingVariables
	}
}
