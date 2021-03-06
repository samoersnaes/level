module Mutation.UpdateSpace exposing (Response(..), request)

import GraphQL exposing (Document)
import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode
import Session exposing (Session)
import Space exposing (Space)
import Task exposing (Task)
import ValidationError exposing (ValidationError)
import ValidationFields


type Response
    = Success Space
    | Invalid (List ValidationError)


document : Document
document =
    GraphQL.toDocument
        """
        mutation UpdateSpace(
          $spaceId: ID!,
          $name: String,
          $slug: String
        ) {
          updateSpace(
            spaceId: $spaceId,
            name: $name,
            slug: $slug
          ) {
            ...ValidationFields
            space {
              ...SpaceFields
            }
          }
        }
        """
        [ Space.fragment
        , ValidationFields.fragment
        ]


variables : String -> String -> String -> Maybe Encode.Value
variables spaceId name slug =
    Just <|
        Encode.object
            [ ( "spaceId", Encode.string spaceId )
            , ( "name", Encode.string name )
            , ( "slug", Encode.string slug )
            ]


successDecoder : Decoder Response
successDecoder =
    Decode.map Success <|
        Decode.at [ "data", "updateSpace", "space" ] Space.decoder


failureDecoder : Decoder Response
failureDecoder =
    Decode.map Invalid <|
        Decode.at [ "data", "updateSpace", "errors" ] (Decode.list ValidationError.decoder)


decoder : Decoder Response
decoder =
    let
        conditionalDecoder : Bool -> Decoder Response
        conditionalDecoder success =
            case success of
                True ->
                    successDecoder

                False ->
                    failureDecoder
    in
    Decode.at [ "data", "updateSpace", "success" ] Decode.bool
        |> Decode.andThen conditionalDecoder


request : String -> String -> String -> Session -> Task Session.Error ( Session, Response )
request spaceId name slug session =
    Session.request session <|
        GraphQL.request document (variables spaceId name slug) decoder
