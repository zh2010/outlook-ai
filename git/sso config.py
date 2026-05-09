
class SSOConfigTest(BaseConfig):

    CLIENT_ID = ""

    CLIENT_SECRET = ""

    CLIENT_URI = "https://aiagent.hspharm.com/icf"

    REDIRECT_URI = "https://aiagent.hspharm.com/icf/sso/login"

    TOKEN_URL = "https://ssoqas.hspharm.com/esc-sso/oauth2.0/accessToken"

    USER_INFO_URL = "https://ssoqas.hspharm.com/esc-sso/oauth2.0/profile"
    
    OAUTH2 = "https://ssoqas.hspharm.com/esc-sso/oauth2.0/authorize?client_id={client_id}&response_type=code&redirect_uri={redirect_uri}&state={state}"
    

class SSOConfig(BaseConfig):

    CLIENT_ID = ""

    CLIENT_SECRET = ""

    CLIENT_URI = "https://review.hspharm.com/icf"

    REDIRECT_URI = "https://review.hspharm.com/icf/sso/login"

    TOKEN_URL = "https://sso.hspharm.com/esc-sso/oauth2.0/accessToken"

    USER_INFO_URL = "https://sso.hspharm.com/esc-sso/oauth2.0/profile"
    
    OAUTH2 = "https://sso.hspharm.com/esc-sso/oauth2.0/authorize?client_id={client_id}&response_type=code&redirect_uri={redirect_uri}&state={state}"
    
