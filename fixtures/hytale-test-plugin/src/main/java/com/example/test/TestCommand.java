package com.example.test;

import com.hypixel.hytale.server.core.Message;
import com.hypixel.hytale.server.core.command.system.CommandContext;
import com.hypixel.hytale.server.core.command.system.basecommands.AbstractAsyncCommand;

import javax.annotation.Nonnull;
import java.util.concurrent.CompletableFuture;

public class TestCommand extends AbstractAsyncCommand {
    public TestCommand() {
        super("test", "test the tests");
    }

    @Override
    protected CompletableFuture<Void> executeAsync(@Nonnull CommandContext context) {
        context.sendMessage(Message.raw("100% coverage"));
        return CompletableFuture.completedFuture(null);
    }
}
