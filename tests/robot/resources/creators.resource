*** Settings ***
Resource    common.resource

*** Keywords ***
Create Or Update Creator Profile
    [Arguments]    ${token}    ${brand_name}=Robot Creator Studio
    @{categories}=    Create List    Handmade Gifts    Art Prints
    ${payload}=    Create Dictionary
    ...    brand_name=${brand_name}
    ...    headline=Custom handmade products
    ...    description=Robot Framework managed creator profile
    ...    years_of_experience=${3}
    ...    portfolio_cover_url=https://example.com/portfolio.png
    ...    response_time_hours=${24}
    ...    instagram_url=https://instagram.com/robotcreator
    ...    website_url=https://example.com
    ...    youtube_url=https://youtube.com/@robotcreator
    ...    categories=${categories}
    ${response}=    PUT API    ${API_PREFIX}/creators/profile    ${payload}    ${token}
    ${body}=    Response Should Be Success    ${response}
    ${creator_id}=    Set Variable    ${body["data"]["creator"]["id"]}
    ${creator_user_id}=    Set Variable    ${body["data"]["creator"]["user_id"]}
    Set Suite Variable    ${CREATOR_PROFILE_ID}    ${creator_id}
    Set Suite Variable    ${CREATOR_PROFILE_USER_ID}    ${creator_user_id}
    RETURN    ${response}

List Creators
    ${response}=    GET API    ${API_PREFIX}/creators
    RETURN    ${response}

Get Creator Profile
    [Arguments]    ${creator_id}
    ${response}=    GET API    ${API_PREFIX}/creators/${creator_id}
    RETURN    ${response}

Save Creator
    [Arguments]    ${customer_token}    ${creator_id}
    ${response}=    POST API    ${API_PREFIX}/creators/${creator_id}/save    ${None}    ${customer_token}
    RETURN    ${response}

Remove Saved Creator
    [Arguments]    ${customer_token}    ${creator_user_id}
    ${response}=    DELETE API    ${API_PREFIX}/creators/saved/${creator_user_id}    ${customer_token}
    RETURN    ${response}

List Saved Creators
    [Arguments]    ${token}
    ${response}=    GET API    ${API_PREFIX}/creators/saved/me    ${token}
    RETURN    ${response}

