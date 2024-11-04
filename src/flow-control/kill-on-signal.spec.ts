import { EventEmitter } from 'events';

import { Command } from '../command';
import { createFakeCloseEvent, FakeCommand } from '../fixtures/fake-command';
import { KillOnSignal } from './kill-on-signal';

let commands: Command[];
let controller: KillOnSignal;
let process: EventEmitter;
let abortController: AbortController;
beforeEach(() => {
    process = new EventEmitter();
    commands = [new FakeCommand(), new FakeCommand()];
    abortController = new AbortController();
    controller = new KillOnSignal({ process, abortController });
});

it('returns commands that keep non-close streams from original commands', () => {
    const { commands: newCommands } = controller.handle(commands);
    newCommands.forEach((newCommand, i) => {
        expect(newCommand.close).not.toBe(commands[i].close);
        expect(newCommand.error).toBe(commands[i].error);
        expect(newCommand.stdout).toBe(commands[i].stdout);
        expect(newCommand.stderr).toBe(commands[i].stderr);
    });
});

it('returns commands that map SIGINT to exit code 0', () => {
    const { commands: newCommands } = controller.handle(commands);
    expect(newCommands).not.toBe(commands);
    expect(newCommands).toHaveLength(commands.length);

    const callback = jest.fn();
    newCommands[0].close.subscribe(callback);
    process.emit('SIGINT', 'SIGINT');

    // A fake command's .kill() call won't trigger a close event automatically...
    commands[0].close.next(createFakeCloseEvent({ exitCode: 1 }));

    expect(callback).not.toHaveBeenCalledWith(expect.objectContaining({ exitCode: 'SIGINT' }));
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ exitCode: 0 }));
});

it('returns commands that keep non-SIGINT exit codes', () => {
    const { commands: newCommands } = controller.handle(commands);
    expect(newCommands).not.toBe(commands);
    expect(newCommands).toHaveLength(commands.length);

    const callback = jest.fn();
    newCommands[0].close.subscribe(callback);
    commands[0].close.next(createFakeCloseEvent({ exitCode: 1 }));

    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ exitCode: 1 }));
});

describe.each(['SIGINT', 'SIGTERM', 'SIGHUP'])('on %s', (signal) => {
    it('kills all commands', () => {
        controller.handle(commands);
        process.emit(signal, signal);

        expect(process.listenerCount(signal)).toBe(1);
        expect(commands[0].kill).toHaveBeenCalledWith(signal);
        expect(commands[1].kill).toHaveBeenCalledWith(signal);
    });

    it('sends abort signal', () => {
        controller.handle(commands);
        process.emit(signal, signal);

        expect(abortController.signal.aborted).toBe(true);
    });
});
