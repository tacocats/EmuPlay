package com.emuplay

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.filters.LargeTest
import androidx.test.rule.ActivityTestRule
import com.wix.detox.Detox
import com.wix.detox.config.DetoxConfig
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Instrumentation entry point for Detox. The JS test suite in `e2e/` drives
 * the app through this single test, which hands control to Detox.
 */
@RunWith(AndroidJUnit4::class)
@LargeTest
class DetoxTest {
  @get:Rule
  val activityRule = ActivityTestRule(MainActivity::class.java, false, false)

  @Test
  fun runDetoxTests() {
    val detoxConfig = DetoxConfig()
    detoxConfig.idlePolicyConfig.masterTimeoutSec = 90
    detoxConfig.idlePolicyConfig.idleResourceTimeoutSec = 60
    // Debug builds fetch the bundle from Metro, which takes longer.
    detoxConfig.rnContextLoadTimeoutSec = if (BuildConfig.DEBUG) 180 else 60

    Detox.runTests(activityRule, detoxConfig)
  }
}
