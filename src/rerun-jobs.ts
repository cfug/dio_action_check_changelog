import {client} from './util'
import * as core from '@actions/core'

function log(message: string): void {
  core.info(message)
}
export async function rerunPrJobs(
  owner: string,
  repo: string,
  prNumber: number
): Promise<void> {
  const github = client()

  // get the PR
  const {data: pullRequest} = await github.pulls.get({
    owner,
    repo,
    pull_number: prNumber
  })

  // Get check suites for the PR
  const {data} = await github.checks.listSuitesForRef({
    owner,
    repo,
    ref: pullRequest.head.sha
  })

  const checkSuites = data.check_suites

  // Get the check runs for each check suite
  for (const checkSuite of checkSuites) {
    log(`Check suite ${checkSuite.id} has status ${checkSuite.status}`)
    log(`Check suite ${checkSuite.id} has conclusion ${checkSuite.conclusion}`)
    if (!checkSuite.pull_requests) continue

    // Get runs for each check suite

    for (const pr of checkSuite.pull_requests) {
      const pullRequestUrl = `https://github.com/${owner}/${repo}/pull/${pr.number}`
      log(`The pr: ${pr.number}, url: ${pr.url}, html_url: ${pullRequestUrl}`)
      if (pr.number === prNumber) {
        log(`Rerunning check suite ${checkSuite.id}`)
        // Rerun the check suite
        await github.checks.rerequestSuite({
          owner,
          repo,
          check_suite_id: checkSuite.id
        })
      }
    }
  }
}

export async function rerunJobsBySameWorkflow(
  owner: string,
  repo: string,
  prNumber: number,
  runId: number,
  showDebugInfo = false
): Promise<void> {
  const github = client()

  // get the PR
  const {data: pullRequest} = await github.pulls.get({
    owner,
    repo,
    pull_number: prNumber
  })

  // Get workflow by run id
  const {data: workflow} = await github.actions.getWorkflowRun({
    owner,
    repo,
    run_id: runId
  })

  if (!workflow) return

  const runs = await github.actions.listWorkflowRuns({
    owner,
    repo,
    workflow_id: workflow.workflow_id,
    branch: pullRequest.head.ref
  })

  for (const run of runs.data.workflow_runs) {
    if (run.status === 'completed') {
      await github.actions.reRunWorkflow({
        owner,
        repo,
        run_id: run.id,
        enable_debug_logging: showDebugInfo
      })
    }
  }
}
