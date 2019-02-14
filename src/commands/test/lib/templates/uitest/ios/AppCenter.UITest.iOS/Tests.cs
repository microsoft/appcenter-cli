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
            _app.WaitForElement(c => c.All());
        }
    }
}
