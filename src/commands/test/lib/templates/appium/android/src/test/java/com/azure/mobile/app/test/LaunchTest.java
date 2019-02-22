package com.azure.mobile.app.test;

import com.microsoft.appcenter.appium.Factory;
import com.microsoft.appcenter.appium.EnhancedAndroidDriver;
import org.junit.*;
import org.junit.rules.TestWatcher;
import io.appium.java_client.MobileElement;
import org.openqa.selenium.remote.DesiredCapabilities;

import java.net.MalformedURLException;
import java.net.URL;
import java.util.Random;
import java.util.List;

public class LaunchTest {
    @Rule
    public TestWatcher watcher = Factory.createWatcher();

    private static EnhancedAndroidDriver<MobileElement> driver;

    @Before
    public void setUp() throws MalformedURLException {
        DesiredCapabilities capabilities = new DesiredCapabilities();

        capabilities.setCapability("platformName", "android");
        capabilities.setCapability("deviceName", "ignored");
        capabilities.setCapability("app", "/path/to/app.apk");

        URL url = new URL("http://localhost:4723/wd/hub");

        driver = Factory.createAndroidDriver(url, capabilities);
    }

    @Test
    public void appDoesLaunch() {
        try {
                Thread.sleep(10000);  // This should allow any animations to complete in most cases
            } catch (InterruptedException ex) {
        }
        driver.label("App has launched");
    }

    //@Test
    public void tapRandomButtonsTest() {
        Random rand = new Random();

        for (int i=0; i<10; i++) {
            List<MobileElement> buttons = driver.findElementsByClassName("android.widget.Button");

            if (buttons.size() == 0) {
                return;
            }

            try {
                MobileElement button = buttons.get(rand.nextInt(buttons.size()));
                button.click();
            } catch (Exception ex) {
                // Fail silently, this is probably due to the number of buttons on the page being reduced between
                // FindElementsByClassName() and the tap().
            }

            try {
                Thread.sleep(3000);  // This should allow any animations to complete in most cases
            } catch (InterruptedException ex) {
            }

            String word = i == 0 ? "a" : "another";

            driver.label("Tapped " + word + " random button");
        }
    }
}
