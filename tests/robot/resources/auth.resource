*** Settings ***
Resource    common.resource

*** Keywords ***
Signup User
    [Arguments]    ${email}    ${password}    ${role}    ${full_name}=Robot User
    ${payload}=    Create Dictionary    full_name=${full_name}    email=${email}    password=${password}    role=${role}
    ${response}=    POST API    ${API_PREFIX}/auth/signup    ${payload}
    RETURN    ${response}

Login User
    [Arguments]    ${email}    ${password}
    ${payload}=    Create Dictionary    email=${email}    password=${password}
    ${response}=    POST API    ${API_PREFIX}/auth/login    ${payload}
    RETURN    ${response}

Ensure User And Login
    [Arguments]    ${email}    ${password}    ${role}    ${full_name}=Robot User
    ${signup}=    Signup User    ${email}    ${password}    ${role}    ${full_name}
    IF    ${signup.status_code} == 200
        ${body}=    Response Should Be Success    ${signup}
    ELSE
        Status Should Be    ${signup}    400
    END
    ${login}=    Login User    ${email}    ${password}
    ${login_body}=    Response Should Be Success    ${login}
    ${access_token}=    Set Variable    ${login_body["data"]["access_token"]}
    ${refresh_token}=    Set Variable    ${login_body["data"]["refresh_token"]}
    ${user_id}=    Set Variable    ${login_body["data"]["user"]["id"]}
    RETURN    ${access_token}    ${refresh_token}    ${user_id}

Login As Customer
    ${token}    ${refresh}    ${user_id}=    Ensure User And Login    ${CUSTOMER_EMAIL}    ${CUSTOMER_PASSWORD}    CUSTOMER    Robot Customer
    Set Suite Variable    ${CUSTOMER_TOKEN}    ${token}
    Set Suite Variable    ${CUSTOMER_REFRESH_TOKEN}    ${refresh}
    Set Suite Variable    ${CUSTOMER_USER_ID}    ${user_id}
    RETURN    ${token}

Login As Creator
    ${token}    ${refresh}    ${user_id}=    Ensure User And Login    ${CREATOR_EMAIL}    ${CREATOR_PASSWORD}    CREATOR    Robot Creator
    Set Suite Variable    ${CREATOR_TOKEN}    ${token}
    Set Suite Variable    ${CREATOR_REFRESH_TOKEN}    ${refresh}
    Set Suite Variable    ${CREATOR_USER_ID}    ${user_id}
    RETURN    ${token}

Login As Admin
    ${token}    ${refresh}    ${user_id}=    Ensure User And Login    ${ADMIN_EMAIL}    ${ADMIN_PASSWORD}    ADMIN    Robot Admin
    Set Suite Variable    ${ADMIN_TOKEN}    ${token}
    Set Suite Variable    ${ADMIN_REFRESH_TOKEN}    ${refresh}
    Set Suite Variable    ${ADMIN_USER_ID}    ${user_id}
    RETURN    ${token}

Get Current User
    [Arguments]    ${token}
    ${response}=    GET API    ${API_PREFIX}/auth/me    ${token}
    RETURN    ${response}

Refresh Access Token
    [Arguments]    ${refresh_token}
    ${payload}=    Create Dictionary    refresh_token=${refresh_token}
    ${response}=    POST API    ${API_PREFIX}/auth/refresh    ${payload}
    RETURN    ${response}

Logout With Refresh Token
    [Arguments]    ${access_token}    ${refresh_token}
    ${payload}=    Create Dictionary    refresh_token=${refresh_token}
    ${response}=    POST API    ${API_PREFIX}/auth/logout    ${payload}    ${access_token}
    RETURN    ${response}

