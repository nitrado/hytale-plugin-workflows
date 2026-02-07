package com.example.test;

import com.hypixel.hytale.server.core.plugin.JavaPlugin;
import com.hypixel.hytale.server.core.plugin.JavaPluginInit;

import javax.annotation.Nonnull;

public class TestPlugin extends JavaPlugin {
    public TestPlugin(@Nonnull JavaPluginInit init) {
        super(init);
    }

    @Override
    public void setup() {
        this.getCommandRegistry().registerCommand(new TestCommand());
    }
}