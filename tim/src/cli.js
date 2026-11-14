#!/usr/bin/env node
import {
  answerPushCheckHook,
  isPushCheckHookCall
} from './sonar/push-check/hook-call.js'

const args = process.argv.slice(2)

if (isPushCheckHookCall(args)) {
  process.exitCode = await answerPushCheckHook()
} else {
  const { buildProgram } = await import('./program.js')
  buildProgram().parse(process.argv)
}
