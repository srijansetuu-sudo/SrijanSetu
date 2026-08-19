*** Settings ***
Resource    common.resource

*** Keywords ***
Create Quotation
    [Arguments]    ${creator_token}    ${requirement_id}    ${price}=250
    ${payload}=    Create Dictionary    requirement_id=${requirement_id}    proposed_price=${price}    estimated_days=${7}    message=Robot quotation proposal
    ${response}=    POST API    ${API_PREFIX}/quotations    ${payload}    ${creator_token}
    ${body}=    Response Should Be Success    ${response}
    ${quotation_id}=    Set Variable    ${body["data"]["quotation"]["id"]}
    Set Suite Variable    ${QUOTATION_ID}    ${quotation_id}
    RETURN    ${response}

My Quotations
    [Arguments]    ${creator_token}
    ${response}=    GET API    ${API_PREFIX}/quotations/my    ${creator_token}
    RETURN    ${response}

List Requirement Quotations
    [Arguments]    ${customer_token}    ${requirement_id}
    ${response}=    GET API    ${API_PREFIX}/requirements/${requirement_id}/quotations    ${customer_token}
    RETURN    ${response}

Accept Quotation
    [Arguments]    ${customer_token}    ${quotation_id}
    ${response}=    POST API    ${API_PREFIX}/quotations/${quotation_id}/accept    ${None}    ${customer_token}
    ${body}=    Response Should Be Success    ${response}
    ${order_id}=    Set Variable    ${body["data"]["order"]["id"]}
    Set Suite Variable    ${ORDER_ID}    ${order_id}
    RETURN    ${response}

Reject Quotation
    [Arguments]    ${customer_token}    ${quotation_id}
    ${response}=    POST API    ${API_PREFIX}/quotations/${quotation_id}/reject    ${None}    ${customer_token}
    RETURN    ${response}

