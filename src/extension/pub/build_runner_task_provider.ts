import * as path from "path";
import * as vs from "vscode";
import { flutterPath, pubPath } from "../../shared/constants";
import { Sdks } from "../../shared/interfaces";
import { fsPath } from "../../shared/utils/fs";
import { getDartWorkspaceFolders } from "../../shared/vscode/utils";
import { config } from "../config";
import { referencesBuildRunner } from "../sdk/utils";
import * as util from "../utils";
import { getToolEnv } from "../utils/processes";

export class PubBuildRunnerTaskProvider implements vs.TaskProvider {
	constructor(private readonly sdks: Sdks, private readonly type: "pub" | "flutter" = "pub") { }

	public provideTasks(token?: vs.CancellationToken): vs.ProviderResult<vs.Task[]> {
		const dartProjects = getDartWorkspaceFolders();

		const tasks: vs.Task[] = [];
		dartProjects.forEach((folder) => {
			const isFlutter = !!(util.isFlutterWorkspaceFolder(folder) && this.sdks.flutter);
			const shouldShow = isFlutter === (this.type === "flutter");
			if (shouldShow && referencesBuildRunner(fsPath(folder.uri))) {
				tasks.push(this.createBuildRunnerCommandBackgroundTask(folder, "watch", vs.TaskGroup.Build, isFlutter));
				tasks.push(this.createBuildRunnerCommandBackgroundTask(folder, "build", vs.TaskGroup.Build, isFlutter));
				tasks.push(this.createBuildRunnerCommandBackgroundTask(folder, "serve", vs.TaskGroup.Build, isFlutter));
				tasks.push(this.createBuildRunnerCommandBackgroundTask(folder, "test", vs.TaskGroup.Test, isFlutter));
			}
		});

		return tasks;
	}

	private createBuildRunnerCommandBackgroundTask(folder: vs.WorkspaceFolder, subCommand: string, group: vs.TaskGroup, isFlutter: boolean) {
		const type = isFlutter ? "flutter" : "pub";
		const program = isFlutter ? path.join(this.sdks.flutter!, flutterPath) : path.join(this.sdks.dart!, pubPath);
		const args = isFlutter ? ["pub", "run", "build_runner", subCommand] : ["run", "build_runner", subCommand];
		if (config.buildRunnerAdditionalArgs) {
			args.push(...config.buildRunnerAdditionalArgs);
		}

		const task = new vs.Task(
			{
				command: subCommand,
				type,
			},
			folder,
			`build_runner ${subCommand}`,
			type,
			new vs.ProcessExecution(
				program,
				args,
				{ cwd: fsPath(folder.uri), env: getToolEnv() },
			),
			"$dart-pub-build_runner");
		task.group = group;
		task.isBackground = true;
		task.name = `build_runner ${subCommand}`;
		return task;
	}

	public resolveTask(task: vs.Task, token?: vs.CancellationToken): undefined {
		return undefined;
	}

}
