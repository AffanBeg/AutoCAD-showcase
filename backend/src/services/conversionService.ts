import { promises as fs } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { env } from '../config/env.js';

const FREECAD_SCRIPT = `
import os
import sys
import traceback

def main():
    if len(sys.argv) < 3:
        print("Missing arguments: input_path output_path", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    linear_deflection = float(os.environ.get("LINEAR_DEFLECTION", "0.1"))
    angular_deflection = float(os.environ.get("ANGULAR_DEFLECTION", "0.3490658504"))

    try:
        import FreeCAD
        import Mesh
        import MeshPart
        import Part

        shape = Part.Shape()
        shape.read(input_path)

        mesh = MeshPart.meshFromShape(
            Shape=shape,
            LinearDeflection=linear_deflection,
            AngularDeflection=angular_deflection,
            Relative=False
        )

        mesh.write(output_path)
        FreeCAD.closeDocument(FreeCAD.ActiveDocument.Name)
        print(f"Converted {input_path} to {output_path}")
    except Exception as err:
        traceback.print_exc()
        sys.exit(2)

if __name__ == "__main__":
    main()
`.trim();

const CADQUERY_SCRIPT = `
import os
import sys
import traceback

def main():
    if len(sys.argv) < 3:
        print("Missing arguments: input_path output_path", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    tolerance = float(os.environ.get("TOLERANCE", "0.1"))
    angular_tolerance = float(os.environ.get("ANGULAR_TOLERANCE", "0.3490658504"))

    try:
        import cadquery as cq
        from cadquery import exporters
        from cadquery import importers

        ext = os.path.splitext(input_path)[1].lower()

        if ext in [".step", ".stp"]:
            model = importers.importStep(input_path)
        elif ext in [".iges", ".igs"]:
            model = importers.importStep(input_path)
        else:
            raise ValueError(f"Unsupported CAD extension {ext}")

        exporters.export(
            model,
            output_path,
            exporters.ExportTypes.STL,
            tolerance=tolerance,
            angularTolerance=angular_tolerance,
        )
        print(f"Converted {input_path} to {output_path}")
    except Exception as err:
        traceback.print_exc()
        sys.exit(2)

if __name__ == "__main__":
    main()
`.trim();

export type ConversionResult = {
  buffer: Buffer;
  filename: string;
  contentType: string;
  skipped: boolean;
};

export class ConversionConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConversionConfigurationError';
  }
}

export class ConversionFailedError extends Error {
  constructor(message: string, readonly causes: Error[]) {
    super(message);
    this.name = 'ConversionFailedError';
  }
}

class CommandExecutionError extends Error {
  constructor(
    message: string,
    readonly command: string,
    readonly args: ReadonlyArray<string>,
    readonly exitCode: number | null,
    readonly stdout: string,
    readonly stderr: string
  ) {
    super(message);
    this.name = 'CommandExecutionError';
  }
}

type RunCommandOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  shell?: boolean;
};

type RunCommandResult = {
  stdout: string;
  stderr: string;
};

const runCommand = async (
  command: string,
  args: string[],
  { cwd, env: envVars, timeoutMs, shell }: RunCommandOptions = {}
): Promise<RunCommandResult> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...envVars },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      shell
    });

    let stdout = '';
    let stderr = '';
    let timeoutHandle: NodeJS.Timeout | undefined;

    const cleanup = () => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    };

    if (child.stdout) {
      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });
    }

    child.on('error', (error) => {
      cleanup();
      reject(error);
    });

    if (timeoutMs && timeoutMs > 0) {
      timeoutHandle = setTimeout(() => {
        child.kill();
        cleanup();
        reject(
          new CommandExecutionError(
            `Command timed out after ${timeoutMs}ms`,
            command,
            args,
            null,
            stdout,
            stderr
          )
        );
      }, timeoutMs);
    }

    child.on('close', (code) => {
      cleanup();
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new CommandExecutionError(
          `Command "${command}" exited with code ${code}`,
          command,
          args,
          code,
          stdout,
          stderr
        )
      );
    });
  });

const ensureFileExists = async (filePath: string) => {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`Expected conversion output at ${filePath} but file was not found`);
  }
};

const writeScript = async (directory: string, filename: string, contents: string) => {
  const filePath = path.join(directory, filename);
  await fs.writeFile(filePath, contents, 'utf-8');
  return filePath;
};

const createTempWorkspace = async () => {
  const baseDir = path.join(tmpdir(), 'cad-convert-');
  return fs.mkdtemp(baseDir);
};

const freecadAvailable = () => Boolean(env.FREECAD_CMD);
const cadQueryAvailable = () => Boolean(env.CADQUERY_DOCKER_IMAGE);

const runFreecad = async (inputPath: string, outputPath: string, workspace: string) => {
  if (!env.FREECAD_CMD) {
    throw new ConversionConfigurationError('FREECAD_CMD environment variable is not configured');
  }

  const scriptPath = await writeScript(workspace, 'freecad_convert.py', FREECAD_SCRIPT);

  try {
    const args = [scriptPath, inputPath, outputPath];
    await runCommand(env.FREECAD_CMD, args, {
      cwd: workspace,
      timeoutMs: env.CAD_CONVERSION_TIMEOUT_MS
    });
  } finally {
    await fs.rm(scriptPath, { force: true });
  }

  await ensureFileExists(outputPath);
};

const runCadQuery = async (inputPath: string, outputPath: string, workspace: string) => {
  if (!env.CADQUERY_DOCKER_IMAGE) {
    throw new ConversionConfigurationError('CADQUERY_DOCKER_IMAGE environment variable is not configured');
  }

  const scriptPath = await writeScript(workspace, 'cadquery_convert.py', CADQUERY_SCRIPT);

  const args = [
    'run',
    '--rm',
    '-v',
    `${workspace.replace(/\\/g, '/')}:/workspace`,
    env.CADQUERY_DOCKER_IMAGE,
    'python',
    '/workspace/cadquery_convert.py',
    `/workspace/${path.basename(inputPath)}`,
    `/workspace/${path.basename(outputPath)}`
  ];

  try {
    await runCommand('docker', args, {
      timeoutMs: env.CAD_CONVERSION_TIMEOUT_MS
    });
  } finally {
    await fs.rm(scriptPath, { force: true });
  }

  await ensureFileExists(outputPath);
};

type ConvertCadParams = {
  file: Express.Multer.File;
  outputBaseName: string;
};

export const convertCadFileToStl = async ({
  file,
  outputBaseName
}: ConvertCadParams): Promise<ConversionResult> => {
  const workspace = await createTempWorkspace();
  const inputExt = path.extname(file.originalname).toLowerCase();
  const inputFilename = `${outputBaseName}${inputExt || ''}`;
  const inputPath = path.join(workspace, inputFilename);
  const outputFilename = `${outputBaseName}.stl`;
  const outputPath = path.join(workspace, outputFilename);

  const errors: Error[] = [];

  try {
    await fs.writeFile(inputPath, file.buffer);

    if (freecadAvailable()) {
      try {
        await runFreecad(inputPath, outputPath, workspace);
        const buffer = await fs.readFile(outputPath);
        return {
          buffer,
          filename: outputFilename,
          contentType: 'model/stl',
          skipped: false
        };
      } catch (error) {
        errors.push(error as Error);
        // eslint-disable-next-line no-console
        console.error('FreeCAD conversion failed', error);
      }
    }

    if (cadQueryAvailable()) {
      try {
        await runCadQuery(inputPath, outputPath, workspace);
        const buffer = await fs.readFile(outputPath);
        return {
          buffer,
          filename: outputFilename,
          contentType: 'model/stl',
          skipped: false
        };
      } catch (error) {
        errors.push(error as Error);
        // eslint-disable-next-line no-console
        console.error('CadQuery conversion failed', error);
      }
    }

    if (!freecadAvailable() && !cadQueryAvailable()) {
      throw new ConversionConfigurationError(
        'No CAD conversion tool configured. Set FREECAD_CMD and/or CADQUERY_DOCKER_IMAGE.'
      );
    }

    throw new ConversionFailedError('CAD conversion failed', errors);
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
};
