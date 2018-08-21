using System;
using System.Linq;
using System.Threading;
using NUnit.Framework;
using Xamarin.UITest;
using Xamarin.UITest.iOS;

namespace AppCenter.UITest.iOS
{
    public class Tests
    {
        iOSApp _app;

        [SetUp]
        public void SetUp()
        {
            _app = ConfigureApp.iOS.AppBundle("/path/to/app.app").StartApp();
        }

        [Test]
        public void AppDoesLaunch()
        {
        }

        // [Test]
        [Ignore]
        public void TapRandomButtonsTest()
        {
            var rand = new Random();

            for (var i = 0; i < 10; i++)
            {
                var buttons = _app.Query(c => c.Button()).ToArray();

                if (!buttons.Any())
                {
                    break;
                }

                try
                {
                    _app.Tap(c => c.Button().Index(rand.Next(0, buttons.Length - 1)));
                }
                catch
                {
                    // Fail silently, this is probably due to the number of buttons on the page being reduced between
                    // the app.Query() and the app.Tap().
                }

                var word = i == 0 ? "a" : "another";

                _app.Screenshot($"Tapped {word} random button");

                Thread.Sleep(3000);  // This should allow any animations to complete in most cases
            }
        }
    }
}
